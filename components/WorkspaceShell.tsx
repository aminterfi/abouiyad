'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import {
  BellRing,
  BriefcaseBusiness,
  Building2,
  CircleHelp,
  CreditCard,
  FileArchive,
  FileStack,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  SquareUserRound,
  Ticket,
  Users,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  getDefaultWorkspacePath,
  isManagementSlug,
  normalizeWorkspaceSession,
  type ShellKey,
} from '@/lib/workspace'

type NavItem = {
  label: string
  href: string
  section: string
  icon: LucideIcon
}

function cabinetNav(slug: string, isPlatformAdmin: boolean): NavItem[] {
  return [
    { section: 'Cabinet', label: 'Accueil cabinet', href: `/${slug}/cabinet`, icon: BriefcaseBusiness },
    { section: 'Cabinet', label: 'Clients geres', href: `/${slug}/cabinet/clients`, icon: Building2 },
    { section: 'Operations', label: 'Demandes', href: `/${slug}/cabinet/demandes`, icon: BellRing },
    { section: 'Operations', label: 'Tickets', href: `/${slug}/cabinet/tickets`, icon: Ticket },
    { section: 'Operations', label: 'Documents', href: `/${slug}/cabinet/documents`, icon: FileArchive },
    ...(isPlatformAdmin ? [
      { section: 'Pilotage', label: 'Abonnements', href: `/${slug}/cabinet/abonnements`, icon: CreditCard },
      { section: 'Pilotage', label: 'Configuration', href: `/${slug}/cabinet/configuration`, icon: SlidersHorizontal },
    ] : []),
  ]
}

function clientNav(slug: string): NavItem[] {
  return [
    { section: 'Espace client', label: 'Tableau de bord', href: `/${slug}/client`, icon: LayoutDashboard },
    { section: 'Facturation', label: 'Factures', href: `/${slug}/client/factures`, icon: Receipt },
    { section: 'Facturation', label: 'Paiements', href: `/${slug}/client/paiements`, icon: WalletCards },
    { section: 'Facturation', label: 'Clients', href: `/${slug}/client/clients`, icon: Users },
    { section: 'Facturation', label: 'Produits', href: `/${slug}/client/produits`, icon: Package },
    { section: 'Facturation', label: 'Stock', href: `/${slug}/client/stock`, icon: FileStack },
    { section: 'Collaboration', label: 'Demandes', href: `/${slug}/client/demandes`, icon: BellRing },
    { section: 'Collaboration', label: 'Tickets', href: `/${slug}/client/tickets`, icon: Ticket },
    { section: 'Collaboration', label: 'Documents', href: `/${slug}/client/documents`, icon: FileArchive },
    { section: 'Administration', label: 'Utilisateurs', href: `/${slug}/client/utilisateurs`, icon: SquareUserRound },
    { section: 'Administration', label: 'Parametres', href: `/${slug}/client/parametres`, icon: Settings2 },
    { section: 'Administration', label: 'Profil', href: `/${slug}/client/profil`, icon: CircleHelp },
  ]
}

function buildNav(slug: string, shell: ShellKey, isPlatformAdmin: boolean) {
  if (shell === 'client') return clientNav(slug)
  return cabinetNav(slug, isPlatformAdmin)
}

function shellTitle(shell: ShellKey) {
  if (shell === 'client') {
    return {
      title: 'Espace client',
      subtitle: 'Facturation, paiements, stock et collaboration au quotidien.',
    }
  }

  return {
    title: 'Cabinet',
    subtitle: 'Pilotage des clients, abonnements et files operationnelles.',
  }
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const resolvedShell: ShellKey = shell === 'admin-rs' ? 'cabinet' : shell

  useEffect(() => {
    const raw = localStorage.getItem('user')
    const session = normalizeWorkspaceSession(JSON.parse(raw || '{}'))
    if (!session?.company_id && !session?.is_platform_admin) {
      router.push(`/${slug}`)
      return
    }

    const allowedShell: ShellKey = isManagementSlug(slug) ? 'cabinet' : 'client'
    if (resolvedShell !== allowedShell) {
      router.replace(`/${slug}/${allowedShell}`)
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

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const isPlatformAdmin = user?.is_platform_admin === true
  const nav = useMemo(() => buildNav(slug, resolvedShell, isPlatformAdmin), [slug, resolvedShell, isPlatformAdmin])
  const sections = Array.from(new Set(nav.map((item) => item.section)))
  const titleMeta = shellTitle(resolvedShell)
  const currentLabel = nav.find((item) => pathname === item.href)?.label || titleMeta.title
  const brandName = settings?.company_name || user?.company_name || 'RSS'
  const brandColor = settings?.primary_color || '#2563EB'

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
      <div className={`workspace-shell ${resolvedShell === 'cabinet' ? 'theme-cabinet' : 'theme-client'}`}>
        <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', color:'var(--ws-muted)' }}>
          Chargement...
        </div>
      </div>
    )
  }

  return (
    <div className={`workspace-shell ${resolvedShell === 'cabinet' ? 'theme-cabinet' : 'theme-client'}`}>
      {mobileOpen && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.44)', zIndex:30 }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`ws-sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="ws-sidebar-head">
          <button className="ws-brand-button" onClick={goHome}>
            <div className="ws-brand-row">
              {settings?.logo_url ? (
                <img className="ws-brand-image" src={settings.logo_url} alt={brandName} />
              ) : (
                <div className="ws-brand-mark" style={{ background:brandColor }}>
                  {brandName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="ws-brand-title">{brandName}</div>
                <div className="ws-brand-subtitle">/{slug}</div>
              </div>
            </div>
          </button>
        </div>

        <nav className="ws-sidebar-nav">
          {sections.map((section) => (
            <div key={section} className="ws-nav-group">
              <div className="ws-nav-label">{section}</div>
              <div style={{ display:'grid', gap:6 }}>
                {nav.filter((item) => item.section === section).map((item) => {
                  const Icon = item.icon
                  const active = pathname === item.href
                  return (
                    <Link key={item.href} href={item.href} className={`ws-nav-link ${active ? 'is-active' : ''}`}>
                      <Icon className="ws-nav-icon" />
                      <span className="ws-nav-text">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="ws-sidebar-foot">
          <div className="ws-user-name">{user.full_name}</div>
          <div className="ws-user-meta">
            {resolvedShell === 'client' ? 'Espace client' : isPlatformAdmin ? 'Cabinet / administration' : 'Cabinet'}
          </div>
          <button className="ws-logout-button" onClick={logout}>
            <LogOut size={16} />
            <span>Deconnexion</span>
          </button>
        </div>
      </aside>

      <div className="ws-main">
        <header className="ws-topbar">
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button className="ws-mobile-menu" onClick={() => setMobileOpen((value) => !value)}>
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div>
              <div className="ws-topbar-title">{currentLabel}</div>
              <div className="ws-topbar-subtitle">{titleMeta.subtitle}</div>
            </div>
          </div>
          <div className="ws-topbar-actions">
            {isPlatformAdmin && resolvedShell === 'cabinet' && isManagementSlug(slug) && (
              <span className="workspace-chip accent">
                <ShieldCheck size={13} />
                <span>Admin RS</span>
              </span>
            )}
            <Link href="/hub" className="ws-topbar-link">
              <Building2 size={15} />
              <span>Mes entreprises</span>
            </Link>
          </div>
        </header>

        <main className="ws-content">{children}</main>
      </div>
    </div>
  )
}
