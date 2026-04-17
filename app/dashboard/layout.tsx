'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

const NAV = [
  { label: 'Tableau de bord', href: '/dashboard', section: 'Général', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
  { label: 'Factures', href: '/dashboard/factures', section: 'Gestion', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  { label: 'Clients', href: '/dashboard/clients', section: 'Gestion', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> },
  { label: 'Paiements', href: '/dashboard/paiements', section: 'Gestion', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
  { label: 'Produits & Services', href: '/dashboard/produits', section: 'Gestion', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> },
  { label: 'Utilisateurs', href: '/dashboard/utilisateurs', section: 'Administration', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
  { label: 'Paramètres', href: '/dashboard/parametres', section: 'Administration', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 115 19.07"/></svg> },
]

const SECTIONS = ['Général', 'Gestion', 'Administration']

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    setUser(JSON.parse(u))
  }, [])

  function logout() {
    localStorage.removeItem('user')
    router.push('/')
  }

  if (!user) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f4f1' }}>
      <div style={{ color: '#a8a69e', fontSize: 14 }}>Chargement...</div>
    </div>
  )

  const initials = user.full_name?.split(' ').map((w: string) => w[0]).slice(0, 2).join('')
  const currentLabel = NAV.find(n => n.href === pathname)?.label || 'Tableau de bord'

  const Sidebar = () => (
    <div style={{ width: 218, background: '#1a1916', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* LOGO */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, background: '#2563EB', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>A</div>
        <div>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, letterSpacing: '-.2px' }}>ABOU IYAD</div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>RS Comptabilité</div>
        </div>
      </div>

      {/* NAV */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {SECTIONS.map(section => (
          <div key={section}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.7px', padding: '8px 8px 4px' }}>
              {section}
            </div>
            {NAV.filter(n => n.section === section).map(item => {
              const active = pathname === item.href
              return (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                    borderRadius: 5, marginBottom: 1, fontSize: 13,
                    fontWeight: active ? 500 : 400,
                    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                    background: active ? 'rgba(37,99,235,0.3)' : 'transparent',
                    textDecoration: 'none', transition: 'all .15s',
                  }}>
                  <span style={{ opacity: active ? 1 : 0.6, flexShrink: 0 }}>{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* USER */}
      <div onClick={() => { router.push('/dashboard/profil'); setOpen(false) }}
        style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', flexShrink: 0 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{user.role}</div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Développé par RS Comptabilité</div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f5f4f1' }}>

      {/* OVERLAY MOBILE */}
      {open && (
        <div onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} />
      )}

      {/* SIDEBAR DESKTOP */}
      <div style={{ flexShrink: 0, display: 'none' }} className="md:block" id="sidebar-desktop">
        <Sidebar />
      </div>
      <div className="hidden md:flex" style={{ flexShrink: 0 }}>
        <Sidebar />
      </div>

      {/* SIDEBAR MOBILE */}
      <div style={{
        position: 'fixed', top: 0, left: 0, height: '100%', zIndex: 100,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease', width: 218,
      }} className="md:hidden">
        <Sidebar />
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* TOPBAR */}
        <div style={{ height: 52, background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', padding: '0 22px', gap: 10, flexShrink: 0 }}>
          <button onClick={() => setOpen(!open)} className="md:hidden"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b6860" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <span style={{ flex: 1, fontWeight: 600, fontSize: 15, color: '#1a1916' }}>{currentLabel}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, background: 'rgba(37,99,235,0.1)', color: '#2563EB', padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>
              {user.role}
            </span>
            <button onClick={logout}
              style={{ fontSize: 12, color: '#dc2626', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 5, padding: '5px 10px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>
              Déconnexion
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
          {children}
        </div>
      </div>
    </div>
  )
}