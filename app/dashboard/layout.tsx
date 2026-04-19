'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const DashIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
const BillIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
const ClientIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
const PayIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
const ProdIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
const UserIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
const SettingIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
const PlusIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>

const ALL_NAV = [
  { label: 'Tableau de bord', href: '/dashboard', section: 'Général', icon: DashIcon, roles: ['superadmin','admin','employe','lecteur'] },
  { label: 'Factures', href: '/dashboard/factures', section: 'Gestion', icon: BillIcon, roles: ['superadmin','admin','employe','lecteur'] },
  { label: 'Clients', href: '/dashboard/clients', section: 'Gestion', icon: ClientIcon, roles: ['superadmin','admin','employe','lecteur'] },
  { label: 'Paiements', href: '/dashboard/paiements', section: 'Gestion', icon: PayIcon, roles: ['superadmin','admin','employe','lecteur'] },
  { label: 'Produits', href: '/dashboard/produits', section: 'Gestion', icon: ProdIcon, roles: ['superadmin','admin','employe','lecteur'] },
  { label: 'Utilisateurs', href: '/dashboard/utilisateurs', section: 'Administration', icon: UserIcon, roles: ['superadmin','admin'] },
  { label: 'Paramètres', href: '/dashboard/parametres', section: 'Administration', icon: SettingIcon, roles: ['superadmin','admin'] },
]

const SECTIONS = ['Général', 'Gestion', 'Administration']

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [settings, setSettings] = useState<any>({})
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    setUser(JSON.parse(u))
    const savedCollapsed = localStorage.getItem('sidebar_collapsed')
    if (savedCollapsed === 'true') setCollapsed(true)
    fetchSettings()

    // Detect mobile
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  async function fetchSettings() {
    const { data } = await supabase.from('settings').select('*').single()
    if (data) {
      setSettings(data)
      if (data.font_family) document.body.style.fontFamily = `${data.font_family}, sans-serif`
      if (data.font_size_base) document.body.style.fontSize = `${data.font_size_base}px`
    }
  }

  useEffect(() => {
    if (!user) return
    const navItem = ALL_NAV.find(n => n.href === pathname)
    if (navItem && !navItem.roles.includes(user.role)) {
      router.push('/dashboard')
    }
  }, [user, pathname])

  function toggleCollapsed() {
    const newVal = !collapsed
    setCollapsed(newVal)
    localStorage.setItem('sidebar_collapsed', String(newVal))
  }

  // 🎯 Auto-collapse on navigation (desktop only)
  function handleNavClick() {
    setOpen(false) // close mobile
    if (!isMobile) {
      setCollapsed(true)
      localStorage.setItem('sidebar_collapsed', 'true')
    }
  }

  function logout() {
    localStorage.removeItem('user')
    router.push('/')
  }

  if (!mounted || !user) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f4f1' }}>
      <div style={{ color: '#a8a69e', fontSize: 14 }}>Chargement...</div>
    </div>
  )

  const NAV = ALL_NAV.filter(n => n.roles.includes(user.role))
  const initials = user.full_name?.split(' ').map((w: string) => w[0]).slice(0, 2).join('')
  const currentLabel = NAV.find(n => n.href === pathname)?.label || 'Tableau de bord'
  const sidebarWidth = collapsed ? 64 : 218
  const companyName = settings.company_name || 'ABOU IYAD'

  // ===== MOBILE BOTTOM NAV =====
  const MOBILE_NAV = [
    { label: 'Accueil', href: '/dashboard', icon: DashIcon },
    { label: 'Factures', href: '/dashboard/factures', icon: BillIcon },
    { label: 'Clients', href: '/dashboard/clients', icon: ClientIcon },
    { label: 'Paiements', href: '/dashboard/paiements', icon: PayIcon },
  ]

  const Sidebar = ({ inDrawer = false }: { inDrawer?: boolean }) => (
    <div style={{ width: inDrawer ? 240 : sidebarWidth, background: '#1a1916', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', transition: 'width .25s ease' }}>
      {/* LOGO */}
      <div style={{ padding: (collapsed && !inDrawer) ? '18px 0' : '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: (collapsed && !inDrawer) ? 'center' : 'flex-start', gap: 10, flexShrink: 0 }}>
        {settings.logo_url ? (
          <img src={settings.logo_url} alt="Logo" style={{ width: 32, height: 32, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 32, height: 32, background: settings.primary_color || '#2563EB', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
            {companyName.charAt(0)}
          </div>
        )}
        {(!collapsed || inDrawer) && (
          <div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, letterSpacing: '-.2px' }}>{companyName}</div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>RS Comptabilité</div>
          </div>
        )}
      </div>

      {/* NAV */}
      <nav style={{ flex: 1, padding: (collapsed && !inDrawer) ? '10px 6px' : '10px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
        {SECTIONS.map(section => {
          const items = NAV.filter(n => n.section === section)
          if (items.length === 0) return null
          return (
            <div key={section}>
              {(!collapsed || inDrawer) && (
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.7px', padding: '8px 8px 4px' }}>
                  {section}
                </div>
              )}
              {(collapsed && !inDrawer) && <div style={{ height: 12 }} />}
              {items.map(item => {
                const Icon = item.icon
                const active = pathname === item.href
                const showCollapsed = collapsed && !inDrawer
                return (
                  <Link key={item.href} href={item.href} onClick={handleNavClick}
                    title={showCollapsed ? item.label : ''}
                    style={{
                      display: 'flex', alignItems: 'center',
                      gap: showCollapsed ? 0 : 10,
                      padding: showCollapsed ? '10px' : '9px 10px',
                      justifyContent: showCollapsed ? 'center' : 'flex-start',
                      borderRadius: 7, marginBottom: 2, fontSize: 13,
                      fontWeight: active ? 500 : 400,
                      color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                      background: active ? 'rgba(37,99,235,0.3)' : 'transparent',
                      textDecoration: 'none', transition: 'all .15s',
                      position: 'relative'
                    }}>
                    <span style={{ opacity: active ? 1 : 0.6, flexShrink: 0, display: 'flex' }}><Icon /></span>
                    {(!showCollapsed) && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                    {active && showCollapsed && (
                      <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 18, background: '#2563EB', borderRadius: '0 2px 2px 0' }} />
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {!inDrawer && (
        <button onClick={toggleCollapsed}
          style={{ background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', padding: '8px', color: 'rgba(255,255,255,0.5)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, fontFamily: 'inherit' }}
          title={collapsed ? 'Agrandir' : 'Réduire'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: '.2s' }}><polyline points="15 18 9 12 15 6" /></svg>
          {!collapsed && 'Réduire'}
        </button>
      )}

      <div onClick={() => { router.push('/dashboard/profil'); setOpen(false) }}
        title={(collapsed && !inDrawer) ? user.full_name : ''}
        style={{ padding: (collapsed && !inDrawer) ? '10px' : 12, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: (collapsed && !inDrawer) ? 'center' : 'flex-start', gap: 9, cursor: 'pointer', flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{initials}</div>
        {(!collapsed || inDrawer) && (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{user.role}</div>
          </div>
        )}
      </div>

      {(!collapsed || inDrawer) && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Développé par RS Comptabilité</div>
        </div>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f5f4f1' }}>

      {/* DESKTOP SIDEBAR */}
      {!isMobile && (
        <div style={{ flexShrink: 0 }}>
          <Sidebar />
        </div>
      )}

      {/* MOBILE DRAWER OVERLAY */}
      {isMobile && open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} />
      )}

      {/* MOBILE DRAWER */}
      {isMobile && (
        <div style={{
          position: 'fixed', top: 0, left: 0, height: '100%', zIndex: 100,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease', width: 240,
        }}>
          <Sidebar inDrawer />
        </div>
      )}

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* TOPBAR */}
        <div style={{ height: 52, background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, flexShrink: 0 }}>
          {isMobile && (
            <button onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b6860" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
          )}
          <span style={{ flex: 1, fontWeight: 600, fontSize: 15, color: '#1a1916' }}>{currentLabel}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, background: 'rgba(37,99,235,0.1)', color: '#2563EB', padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>{user.role}</span>
            <button onClick={logout} style={{ fontSize: 12, color: '#dc2626', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 5, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>Déconnexion</button>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 14px 84px' : 22 }}>
          {children}
        </div>

        {/* MOBILE BOTTOM NAV */}
        {isMobile && (
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, height: 66,
            background: '#fff', borderTop: '1px solid rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-around',
            zIndex: 50, boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)'
          }}>
            {MOBILE_NAV.slice(0, 2).map(item => {
              const Icon = item.icon
              const active = pathname === item.href
              return (
                <Link key={item.href} href={item.href}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 4, textDecoration: 'none', padding: '8px 14px', flex: 1,
                    color: active ? '#2563EB' : '#a8a69e',
                    fontSize: 10, fontWeight: active ? 600 : 500,
                    transition: 'transform .15s', position: 'relative'
                  }}>
                  <div style={{ transform: active ? 'scale(1.1)' : 'scale(1)', transition: '.15s' }}><Icon /></div>
                  <span>{item.label}</span>
                  {active && <div style={{ position: 'absolute', top: 0, width: 30, height: 3, background: '#2563EB', borderRadius: '0 0 3px 3px' }} />}
                </Link>
              )
            })}

            {/* CENTER QUICK ACTION BUTTON */}
            <Link href="/dashboard/factures"
              style={{
                width: 54, height: 54, borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563EB, #1d4ed8)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(37,99,235,0.4), 0 0 0 4px #fff',
                marginTop: -28, flexShrink: 0, textDecoration: 'none',
                transition: 'transform .15s'
              }}
              onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.92)' }}
              onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)' }}>
              <PlusIcon />
            </Link>

            {MOBILE_NAV.slice(2).map(item => {
              const Icon = item.icon
              const active = pathname === item.href
              return (
                <Link key={item.href} href={item.href}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 4, textDecoration: 'none', padding: '8px 14px', flex: 1,
                    color: active ? '#2563EB' : '#a8a69e',
                    fontSize: 10, fontWeight: active ? 600 : 500,
                    transition: 'transform .15s', position: 'relative'
                  }}>
                  <div style={{ transform: active ? 'scale(1.1)' : 'scale(1)', transition: '.15s' }}><Icon /></div>
                  <span>{item.label}</span>
                  {active && <div style={{ position: 'absolute', top: 0, width: 30, height: 3, background: '#2563EB', borderRadius: '0 0 3px 3px' }} />}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}