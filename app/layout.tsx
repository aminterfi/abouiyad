'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const ALL_NAV = [
  { label: 'Tableau de bord', href: '/dashboard', section: 'Général', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>, roles: ['superadmin','admin','employe','lecteur'] },
  { label: 'Factures', href: '/dashboard/factures', section: 'Gestion', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, roles: ['superadmin','admin','employe','lecteur'] },
  { label: 'Clients', href: '/dashboard/clients', section: 'Gestion', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>, roles: ['superadmin','admin','employe','lecteur'] },
  { label: 'Paiements', href: '/dashboard/paiements', section: 'Gestion', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>, roles: ['superadmin','admin','employe','lecteur'] },
  { label: 'Produits', href: '/dashboard/produits', section: 'Gestion', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>, roles: ['superadmin','admin','employe','lecteur'] },
  { label: 'Utilisateurs', href: '/dashboard/utilisateurs', section: 'Administration', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>, roles: ['superadmin','admin'] },
  { label: 'Paramètres', href: '/dashboard/parametres', section: 'Administration', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>, roles: ['superadmin','admin'] },
]

const SECTIONS = ['Général', 'Gestion', 'Administration']

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [settings, setSettings] = useState<any>({})
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    const parsed = JSON.parse(u)
    setUser(parsed)
    const savedCollapsed = localStorage.getItem('sidebar_collapsed')
    if (savedCollapsed === 'true') setCollapsed(true)
    fetchSettings()
  }, [])

  async function fetchSettings() {
    const { data } = await supabase.from('settings').select('*').single()
    if (data) {
      setSettings(data)
      // Appliquer police globalement
      if (data.font_family) document.body.style.fontFamily = `${data.font_family}, sans-serif`
      if (data.font_size_base) document.body.style.fontSize = `${data.font_size_base}px`
    }
  }

  // Bloquer l'accès aux pages restreintes
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

  const Sidebar = () => (
    <div style={{ width: sidebarWidth, background: '#1a1916', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', transition: 'width .25s ease' }}>
      {/* LOGO */}
      <div style={{ padding: collapsed ? '18px 0' : '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 10, flexShrink: 0 }}>
        {settings.logo_url ? (
          <img src={settings.logo_url} alt="Logo" style={{ width: 32, height: 32, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 32, height: 32, background: settings.primary_color || '#2563EB', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
            {companyName.charAt(0)}
          </div>
        )}
        {!collapsed && (
          <div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, letterSpacing: '-.2px' }}>{companyName}</div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>RS Comptabilité</div>
          </div>
        )}
      </div>

      {/* NAV */}
      <nav style={{ flex: 1, padding: collapsed ? '10px 6px' : '10px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
        {SECTIONS.map(section => {
          const sectionItems = NAV.filter(n => n.section === section)
          if (sectionItems.length === 0) return null
          return (
            <div key={section}>
              {!collapsed && (
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.7px', padding: '8px 8px 4px' }}>
                  {section}
                </div>
              )}
              {collapsed && <div style={{ height: 12 }} />}
              {sectionItems.map(item => {
                const active = pathname === item.href
                return (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                    title={collapsed ? item.label : ''}
                    style={{
                      display: 'flex', alignItems: 'center',
                      gap: collapsed ? 0 : 10,
                      padding: collapsed ? '10px' : '9px 10px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      borderRadius: 7, marginBottom: 2, fontSize: 13,
                      fontWeight: active ? 500 : 400,
                      color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                      background: active ? 'rgba(37,99,235,0.3)' : 'transparent',
                      textDecoration: 'none', transition: 'all .15s',
                      position: 'relative'
                    }}>
                    <span style={{ opacity: active ? 1 : 0.6, flexShrink: 0, display: 'flex' }}>{item.icon}</span>
                    {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                    {active && collapsed && (
                      <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 18, background: '#2563EB', borderRadius: '0 2px 2px 0' }} />
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      <button onClick={toggleCollapsed}
        style={{ background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', padding: '8px', color: 'rgba(255,255,255,0.5)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, fontFamily: 'inherit' }}
        title={collapsed ? 'Agrandir' : 'Réduire'}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: '.2s' }}><polyline points="15 18 9 12 15 6" /></svg>
        {!collapsed && 'Réduire'}
      </button>

      <div onClick={() => { router.push('/dashboard/profil'); setOpen(false) }}
        title={collapsed ? user.full_name : ''}
        style={{ padding: collapsed ? '10px' : 12, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 9, cursor: 'pointer', flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{initials}</div>
        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{user.role}</div>
          </div>
        )}
      </div>

      {!collapsed && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Développé par RS Comptabilité</div>
        </div>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f5f4f1' }}>
      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} />}

      <div className="hidden md:flex" style={{ flexShrink: 0 }}><Sidebar /></div>

      <div style={{ position: 'fixed', top: 0, left: 0, height: '100%', zIndex: 100, transform: open ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.3s ease', width: 218 }} className="md:hidden">
        <Sidebar />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <div style={{ height: 52, background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', padding: '0 22px', gap: 10, flexShrink: 0 }}>
          <button onClick={() => setOpen(!open)} className="md:hidden" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b6860" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          <span style={{ flex: 1, fontWeight: 600, fontSize: 15, color: '#1a1916' }}>{currentLabel}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, background: 'rgba(37,99,235,0.1)', color: '#2563EB', padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>{user.role}</span>
            <button onClick={logout} style={{ fontSize: 12, color: '#dc2626', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 5, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>Déconnexion</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>{children}</div>
      </div>
    </div>
  )
}