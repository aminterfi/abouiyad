'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function CompanySwitcher({ slug, companyName, settings, collapsed }: any) {
  const [open, setOpen] = useState(false)
  const [companies, setCompanies] = useState<any[]>([])

  useEffect(() => {
    const stored = localStorage.getItem('owner_companies')
    if (stored) {
      setCompanies(JSON.parse(stored))
    } else {
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      if (u.id && u.type === 'owner') {
        supabase.rpc('get_owner_companies', { p_user_id: u.id }).then(({ data }) => {
          if (data) {
            setCompanies(data)
            localStorage.setItem('owner_companies', JSON.stringify(data))
          }
        })
      }
    }
  }, [])

  function switchCompany(c: any) {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    const updated = { ...u, company_id: c.company_id, company_name: c.company_name, slug: c.slug }
    localStorage.setItem('user', JSON.stringify(updated))
    window.location.href = `/${c.slug}/dashboard`
  }

  const hasMultiple = companies.length > 1
  const initial = companyName?.charAt(0).toUpperCase() || 'C'

  if (collapsed) {
    return (
      <Link href={`/${slug}/dashboard`} style={{padding:'18px 0',borderBottom:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,textDecoration:'none'}}>
        {settings.logo_url ? (
          <img src={settings.logo_url} alt="Logo" style={{width:32,height:32,borderRadius:7,objectFit:'cover'}}/>
        ) : (
          <div style={{width:32,height:32,background:settings.primary_color||'#2563EB',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:14}}>{initial}</div>
        )}
      </Link>
    )
  }

  return (
    <div style={{position:'relative',borderBottom:'1px solid rgba(255,255,255,0.08)',flexShrink:0}}>
      <div onClick={() => hasMultiple && setOpen(!open)}
        style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:10,cursor:hasMultiple?'pointer':'default'}}>
        {settings.logo_url ? (
          <img src={settings.logo_url} alt="Logo" style={{width:32,height:32,borderRadius:7,objectFit:'cover',flexShrink:0}}/>
        ) : (
          <div style={{width:32,height:32,background:settings.primary_color||'#2563EB',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:14,flexShrink:0}}>{initial}</div>
        )}
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:'#fff',fontWeight:600,fontSize:13,letterSpacing:'-.2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{companyName}</div>
          <div style={{color:'rgba(255,255,255,0.4)',fontSize:10,marginTop:2}}>
            {hasMultiple ? `${companies.length} entreprises` : 'Entreprise active'}
          </div>
        </div>
        {hasMultiple && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" style={{transform:open?'rotate(180deg)':'none',transition:'.15s'}}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        )}
      </div>

      {open && hasMultiple && (
        <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#1f1d1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,margin:'4px 8px',zIndex:50,maxHeight:300,overflowY:'auto',boxShadow:'0 10px 30px rgba(0,0,0,0.3)'}}>
          {companies.map((c: any) => {
            const isActive = c.slug === slug
            return (
              <div key={c.company_id}
                onClick={() => !isActive && switchCompany(c)}
                style={{
                  padding:'10px 14px',
                  display:'flex',
                  alignItems:'center',
                  gap:10,
                  cursor: isActive ? 'default' : 'pointer',
                  background: isActive ? 'rgba(37,99,235,0.2)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                {c.logo_url ? (
                  <img src={c.logo_url} style={{width:26,height:26,borderRadius:6,objectFit:'cover'}}/>
                ) : (
                  <div style={{width:26,height:26,background:c.primary_color||'#2563EB',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:11}}>
                    {c.company_name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:'#fff',fontSize:12,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.company_name}</div>
                  <div style={{color:'rgba(255,255,255,0.3)',fontSize:9,fontFamily:'JetBrains Mono,monospace',marginTop:1}}>/{c.slug}</div>
                </div>
                {isActive && <span style={{fontSize:10,color:'#2563EB',fontWeight:600}}>● Active</span>}
                {c.is_primary && !isActive && <span style={{fontSize:9,color:'rgba(255,255,255,0.4)'}}>★</span>}
              </div>
            )
          })}
          <Link href="/hub" 
            style={{display:'block',padding:'10px 14px',color:'#2563EB',fontSize:12,textDecoration:'none',fontWeight:600,borderTop:'1px solid rgba(255,255,255,0.1)',textAlign:'center'}}>
            🏢 Voir toutes mes entreprises
          </Link>
        </div>
      )}
    </div>
  )
}

const DashIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
const BillIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
const ClientIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
const PayIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
const ProdIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
const StockIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
const UserIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
const SettingIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/></svg>
const ShieldIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams() as { slug: string }
  const [user, setUser] = useState<any>(null)
  const [settings, setSettings] = useState<any>({})
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [open, setOpen] = useState(false)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const ALL_NAV = [
    { label: 'Tableau de bord', href: `/${slug}/dashboard`, section: 'Général', icon: DashIcon, roles: ['superadmin','admin','employe','lecteur','owner'], platformAdminOnly: false },
    { label: 'Factures', href: `/${slug}/dashboard/factures`, section: 'Gestion', icon: BillIcon, roles: ['superadmin','admin','employe','lecteur','owner'], platformAdminOnly: false },
    { label: 'Clients', href: `/${slug}/dashboard/clients`, section: 'Gestion', icon: ClientIcon, roles: ['superadmin','admin','employe','lecteur','owner'], platformAdminOnly: false },
    { label: 'Paiements', href: `/${slug}/dashboard/paiements`, section: 'Gestion', icon: PayIcon, roles: ['superadmin','admin','employe','lecteur','owner'], platformAdminOnly: false },
    { label: 'Produits', href: `/${slug}/dashboard/produits`, section: 'Gestion', icon: ProdIcon, roles: ['superadmin','admin','employe','lecteur','owner'], platformAdminOnly: false },
    { label: 'Produits', href: `/${slug}/dashboard/produits`, section: 'Gestion', icon: ProdIcon, roles: ['superadmin','admin','employe','lecteur','owner'], platformAdminOnly: false },
    { label: 'Stock', href: `/${slug}/dashboard/stock`, section: 'Gestion', icon: StockIcon, roles: ['superadmin','admin','employe','owner'], platformAdminOnly: false },
    { label: 'Utilisateurs', href: `/${slug}/dashboard/utilisateurs`, section: 'Administration', icon: UserIcon, roles: ['superadmin','admin','owner'], platformAdminOnly: false },
    { label: 'Paramètres', href: `/${slug}/dashboard/parametres`, section: 'Administration', icon: SettingIcon, roles: ['superadmin','admin','owner'], platformAdminOnly: false },
    { label: 'Admin RS', href: `/${slug}/dashboard/admin-platform`, section: 'RS Comptabilité', icon: ShieldIcon, roles: ['owner'], platformAdminOnly: true },
  ]
  const SECTIONS = ['Général', 'Gestion', 'Administration', 'RS Comptabilité']

  useEffect(() => {
    setMounted(true)
    const u = localStorage.getItem('user')
    if (!u) {
      router.push(`/${slug}`)
      return
    }
    const parsed = JSON.parse(u)
    setUser(parsed)
    setIsPlatformAdmin(parsed.is_platform_admin === true)
    const savedCollapsed = localStorage.getItem('sidebar_collapsed')
    if (savedCollapsed === 'true') setCollapsed(true)
    fetchSettings(parsed.company_id)
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  async function fetchSettings(companyId?: string) {
    if (!companyId) return
    const { data } = await supabase.from('settings').select('*').eq('company_id', companyId).maybeSingle()
    if (data) {
      setSettings(data)
      if (data.font_family) document.body.style.fontFamily = `${data.font_family}, sans-serif`
      if (data.font_size_base) document.body.style.fontSize = `${data.font_size_base}px`
    }
  }

  function toggleCollapsed() {
    const newVal = !collapsed
    setCollapsed(newVal)
    localStorage.setItem('sidebar_collapsed', String(newVal))
  }

  function handleNavClick() {
    setOpen(false)
    if (!isMobile) {
      setCollapsed(true)
      localStorage.setItem('sidebar_collapsed', 'true')
    }
  }

  function logout() {
    localStorage.removeItem('user')
    localStorage.removeItem('subscription')
    localStorage.removeItem('owner_companies')
    supabase.auth.signOut()
    router.push(`/${slug}`)
  }

  if (!mounted || !user) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f4f1'}}><div style={{color:'#a8a69e',fontSize:14}}>Chargement...</div></div>

  const NAV = ALL_NAV.filter(n => {
    if (n.platformAdminOnly && !isPlatformAdmin) return false
    return n.roles.includes(user.role)
  })
  
  const initials = user.full_name?.split(' ').map((w: string) => w[0]).slice(0, 2).join('') || 'U'
  const currentLabel = NAV.find(n => n.href === pathname)?.label || 'Tableau de bord'
  const sidebarWidth = collapsed ? 64 : 218
  const companyName = settings.company_name || user.company_name || 'RSS'

  const Sidebar = ({ inDrawer = false }: { inDrawer?: boolean }) => (
    <div style={{width:inDrawer?240:sidebarWidth,background:'#1a1916',display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',transition:'width .25s ease'}}>
      <CompanySwitcher 
        slug={slug} 
        companyName={companyName} 
        settings={settings} 
        collapsed={collapsed && !inDrawer} 
      />

      <nav style={{flex:1,padding:(collapsed && !inDrawer)?'10px 6px':'10px 8px',overflowY:'auto',overflowX:'hidden'}}>
        {SECTIONS.map(section => {
          const items = NAV.filter(n => n.section === section)
          if (items.length === 0) return null
          return (
            <div key={section}>
              {(!collapsed || inDrawer) && <div style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'.7px',padding:'8px 8px 4px'}}>{section}</div>}
              {(collapsed && !inDrawer) && <div style={{height:12}}/>}
              {items.map(item => {
                const Icon = item.icon
                const active = pathname === item.href
                const showCollapsed = collapsed && !inDrawer
                const isPlatformItem = item.platformAdminOnly
                return (
                  <Link key={item.href} href={item.href} onClick={handleNavClick}
                    style={{display:'flex',alignItems:'center',gap:showCollapsed?0:10,padding:showCollapsed?'10px':'9px 10px',justifyContent:showCollapsed?'center':'flex-start',borderRadius:7,marginBottom:2,fontSize:13,fontWeight:active?500:400,color:active?'#fff':(isPlatformItem?'#a78bfa':'rgba(255,255,255,0.5)'),background:active?(isPlatformItem?'rgba(124,58,237,0.3)':'rgba(37,99,235,0.3)'):'transparent',textDecoration:'none',transition:'all .15s'}}>
                    <span style={{opacity:active?1:0.6,flexShrink:0,display:'flex'}}><Icon/></span>
                    {(!showCollapsed) && <span style={{whiteSpace:'nowrap'}}>{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {!inDrawer && (
        <button onClick={toggleCollapsed} style={{background:'rgba(255,255,255,0.05)',border:'none',cursor:'pointer',padding:8,color:'rgba(255,255,255,0.5)',borderTop:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontSize:11,fontFamily:'inherit'}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{transform:collapsed?'rotate(180deg)':'none',transition:'.2s'}}><polyline points="15 18 9 12 15 6"/></svg>
          {!collapsed && 'Réduire'}
        </button>
      )}

      <div onClick={() => router.push(`/${slug}/dashboard/profil`)}
        style={{padding:(collapsed && !inDrawer)?'10px':12,borderTop:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:(collapsed && !inDrawer)?'center':'flex-start',gap:9,cursor:'pointer',flexShrink:0}}>
        <div style={{width:32,height:32,borderRadius:'50%',background:isPlatformAdmin?'linear-gradient(135deg,#7c3aed,#5B3DF5)':'#2563EB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,color:'#fff',flexShrink:0}}>{initials}</div>
        {(!collapsed || inDrawer) && (
          <div style={{minWidth:0}}>
            <div style={{fontSize:12,fontWeight:500,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.full_name}</div>
            <div style={{fontSize:10,color:isPlatformAdmin?'#a78bfa':'rgba(255,255,255,0.35)'}}>{isPlatformAdmin?'👑 Super Admin RS':user.role}</div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden',background:'#f5f4f1'}}>
      {!isMobile && <div style={{flexShrink:0}}><Sidebar/></div>}
      {isMobile && open && <div onClick={() => setOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:99}}/>}
      {isMobile && (
        <div style={{position:'fixed',top:0,left:0,height:'100%',zIndex:100,transform:open?'translateX(0)':'translateX(-100%)',transition:'transform .3s ease',width:240}}>
          <Sidebar inDrawer/>
        </div>
      )}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
        <div style={{height:52,background:'#fff',borderBottom:'1px solid rgba(0,0,0,0.08)',display:'flex',alignItems:'center',padding:'0 16px',gap:10,flexShrink:0}}>
          {isMobile && (
            <button onClick={() => setOpen(!open)} style={{background:'none',border:'none',cursor:'pointer',padding:4}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b6860" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          )}
          <Link href="/hub" style={{fontSize:12,color:'#2563EB',textDecoration:'none',padding:'4px 10px',background:'rgba(37,99,235,0.08)',borderRadius:5,fontWeight:500}}>🏢 Mes entreprises</Link>
          <span style={{flex:1,fontWeight:600,fontSize:15,color:'#1a1916'}}>{currentLabel}</span>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            {isPlatformAdmin && <span style={{fontSize:10,background:'linear-gradient(135deg,#7c3aed,#5B3DF5)',color:'#fff',padding:'3px 8px',borderRadius:20,fontWeight:600}}>👑 Admin RS</span>}
            <span style={{fontSize:11,background:'rgba(37,99,235,0.1)',color:'#2563EB',padding:'2px 8px',borderRadius:20,fontWeight:500}}>{user.role}</span>
            <button onClick={logout} style={{fontSize:12,color:'#dc2626',background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.15)',borderRadius:5,padding:'5px 10px',cursor:'pointer',fontFamily:'inherit'}}>Déconnexion</button>
          </div>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:isMobile?'16px 14px 84px':22}}>{children}</div>
      </div>
    </div>
  )
}