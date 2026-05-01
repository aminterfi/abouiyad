'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getDefaultWorkspacePath, normalizeWorkspaceSession, type ShellKey } from '@/lib/workspace'

type NavItem = {
  label: string
  href: string
  section: string
}

function buildNav(slug: string, shell: ShellKey, isPlatformAdmin: boolean) {
  if (shell === 'admin-rs') {
    return [
      { section: 'Administration', label: 'Admin RS', href: `/${slug}/admin-rs` },
      { section: 'Administration', label: 'Demandes', href: `/${slug}/admin-rs/demandes` },
      { section: 'Administration', label: 'Tickets', href: `/${slug}/admin-rs/tickets` },
      { section: 'Administration', label: 'Documents', href: `/${slug}/admin-rs/documents` },
      { section: 'Administration', label: 'Cabinet', href: `/${slug}/cabinet` },
    ]
  }

  if (shell === 'cabinet') {
    return [
      { section: 'Cabinet', label: 'Vue cabinet', href: `/${slug}/cabinet` },
      { section: 'Operations', label: 'Demandes', href: `/${slug}/cabinet/demandes` },
      { section: 'Operations', label: 'Tickets', href: `/${slug}/cabinet/tickets` },
      { section: 'Operations', label: 'Documents', href: `/${slug}/cabinet/documents` },
      ...(isPlatformAdmin ? [{ section: 'Cabinet', label: 'Admin RS', href: `/${slug}/admin-rs` }] : []),
    ]
  }

  return [
    { section: 'Client', label: 'Tableau de bord', href: `/${slug}/client` },
    { section: 'Facturation', label: 'Factures', href: `/${slug}/client/factures` },
    { section: 'Facturation', label: 'Clients', href: `/${slug}/client/clients` },
    { section: 'Facturation', label: 'Paiements', href: `/${slug}/client/paiements` },
    { section: 'Facturation', label: 'Produits', href: `/${slug}/client/produits` },
    { section: 'Facturation', label: 'Stock', href: `/${slug}/client/stock` },
    { section: 'Collaboration', label: 'Demandes', href: `/${slug}/client/demandes` },
    { section: 'Collaboration', label: 'Tickets', href: `/${slug}/client/tickets` },
    { section: 'Collaboration', label: 'Documents', href: `/${slug}/client/documents` },
    { section: 'Administration', label: 'Utilisateurs', href: `/${slug}/client/utilisateurs` },
    { section: 'Administration', label: 'Parametres', href: `/${slug}/client/parametres` },
    { section: 'Administration', label: 'Profil', href: `/${slug}/client/profil` },
  ]
}

export default function WorkspaceShell({
  shell,
  children,
}: {
  shell: ShellKey
  children: React.ReactNode
}) {
  const { slug } = useParams() as { slug: string }
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)

  useEffect(() => {
    const session = normalizeWorkspaceSession(JSON.parse(localStorage.getItem('user') || '{}'))
    if (!session?.company_id && !session?.is_platform_admin) {
      router.push(`/${slug}`)
      return
    }
    setUser(session)

    if (session.company_id) {
      supabase
        .from('settings')
        .select('company_name,logo_url,primary_color')
        .eq('company_id', session.company_id)
        .maybeSingle()
        .then(({ data }) => setSettings(data || null))
    }
  }, [router, slug])

  const nav = useMemo(() => buildNav(slug, shell, user?.is_platform_admin === true), [shell, slug, user?.is_platform_admin])
  const sections = Array.from(new Set(nav.map((item) => item.section)))

  const title = nav.find((item) => pathname === item.href)?.label || (shell === 'client' ? 'Espace client' : shell === 'cabinet' ? 'Cabinet' : 'Admin RS')

  function logout() {
    localStorage.removeItem('user')
    localStorage.removeItem('subscription')
    localStorage.removeItem('owner_companies')
    supabase.auth.signOut()
    router.push(`/${slug}`)
  }

  function goHome() {
    router.push(getDefaultWorkspacePath(user, slug))
  }

  if (!user) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f5f4f1', color:'#a8a69e' }}>
        Chargement...
      </div>
    )
  }

  const brandName = settings?.company_name || user.company_name || 'RSS'
  const brandColor = settings?.primary_color || '#2563EB'

  return (
    <div style={{ minHeight:'100vh', background:'#f5f4f1', display:'grid', gridTemplateColumns:'260px minmax(0,1fr)' }}>
      <aside style={{ background:'#16171b', color:'#fff', padding:'20px 16px', display:'flex', flexDirection:'column', gap:18 }}>
        <button onClick={goHome} style={{ background:'transparent', border:'none', color:'#fff', cursor:'pointer', textAlign:'left', padding:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt={brandName} style={{ width:40, height:40, borderRadius:10, objectFit:'cover' }} />
            ) : (
              <div style={{ width:40, height:40, borderRadius:10, background:brandColor, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>
                {brandName.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{brandName}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)' }}>/{slug}</div>
            </div>
          </div>
        </button>

        <div style={{ display:'grid', gap:14 }}>
          {sections.map((section) => (
            <div key={section}>
              <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.6px', color:'rgba(255,255,255,0.38)', marginBottom:8 }}>{section}</div>
              <div style={{ display:'grid', gap:4 }}>
                {nav.filter((item) => item.section === section).map((item) => {
                  const active = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        textDecoration:'none',
                        color: active ? '#fff' : 'rgba(255,255,255,0.68)',
                        background: active ? 'rgba(37,99,235,0.35)' : 'transparent',
                        border:'1px solid ' + (active ? 'rgba(96,165,250,0.35)' : 'transparent'),
                        borderRadius:10,
                        padding:'10px 12px',
                        fontSize:13,
                        fontWeight: active ? 600 : 500,
                      }}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop:'auto', borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:14, display:'grid', gap:8 }}>
          <div style={{ fontSize:12, fontWeight:600 }}>{user.full_name}</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.48)' }}>
            {shell === 'client' ? 'Portail client' : shell === 'cabinet' ? 'Espace cabinet' : 'Administration RS'}
          </div>
          <button onClick={logout} style={{ marginTop:4, border:'1px solid rgba(255,255,255,0.12)', background:'transparent', color:'#fff', borderRadius:10, padding:'10px 12px', cursor:'pointer', fontFamily:'inherit' }}>
            Deconnexion
          </button>
        </div>
      </aside>

      <div style={{ minWidth:0, display:'flex', flexDirection:'column' }}>
        <header style={{ height:58, borderBottom:'1px solid rgba(0,0,0,0.06)', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 18px' }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700 }}>{title}</div>
            <div style={{ fontSize:11, color:'#6b6860', marginTop:2 }}>
              {shell === 'client' ? 'Espace client et operations metier.' : shell === 'cabinet' ? 'Pilotage des clients et files operationnelles.' : 'Gestion des abonnements et workspaces.'}
            </div>
          </div>
          <Link href="/hub" style={{ textDecoration:'none', fontSize:12, color:'#2563EB', fontWeight:600 }}>
            Mes entreprises
          </Link>
        </header>
        <main style={{ padding:20, minWidth:0 }}>{children}</main>
      </div>
    </div>
  )
}
