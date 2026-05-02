'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  BellRing,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  CircleHelp,
  Clock3,
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
import {
  isNotificationEventRelevant,
  loadWorkspaceNotificationContext,
  loadWorkspaceNotifications,
  type WorkspaceNotification,
  type WorkspaceNotificationContext,
} from '@/lib/workspace-notifications'

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

function formatNotificationTime(value?: string) {
  if (!value) return '-'
  const then = new Date(value).getTime()
  const now = Date.now()
  const diffMinutes = Math.max(1, Math.round((now - then) / 60000))
  if (diffMinutes < 60) return `${diffMinutes} min`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} h`
  const diffDays = Math.round(diffHours / 24)
  return `${diffDays} j`
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
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [seenAt, setSeenAt] = useState('')
  const notifRef = useRef<HTMLDivElement | null>(null)
  const notifContextRef = useRef<WorkspaceNotificationContext | null>(null)
  const notificationBootedRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)
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
    setNotifOpen(false)
  }, [pathname])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!notifOpen) return
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [notifOpen])

  useEffect(() => {
    if (!user?.id) return

    const seenKey = `workspace_notifications_seen:${user.id}:${slug}:${resolvedShell}`
    const initialSeenAt = localStorage.getItem(seenKey) || ''
    setSeenAt(initialSeenAt)

    let active = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    function ensureAudioReady() {
      if (typeof window === 'undefined') return
      if (audioContextRef.current) return
      const AudioCtor = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtor) return
      audioContextRef.current = new AudioCtor()
    }

    function playNotificationSound() {
      try {
        ensureAudioReady()
        const audio = audioContextRef.current
        if (!audio) return
        if (audio.state === 'suspended') {
          audio.resume().catch(() => {})
        }
        const oscillator = audio.createOscillator()
        const gain = audio.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(880, audio.currentTime)
        gain.gain.setValueAtTime(0.0001, audio.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.12, audio.currentTime + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.18)
        oscillator.connect(gain)
        gain.connect(audio.destination)
        oscillator.start(audio.currentTime)
        oscillator.stop(audio.currentTime + 0.2)
      } catch {}
    }

    function maybeShowBrowserNotification(item: WorkspaceNotification) {
      if (typeof window === 'undefined' || !('Notification' in window)) return
      if (document.visibilityState === 'visible') return
      if (Notification.permission !== 'granted') return
      try {
        new Notification(item.kind === 'demande' ? 'Nouvelle demande' : 'Mise a jour ticket', {
          body: `${item.companyName} - ${item.title}`,
          tag: item.id,
        })
      } catch {}
    }

    async function run() {
      setNotifLoading(true)
      try {
        const [context, items] = await Promise.all([
          loadWorkspaceNotificationContext(user, pathname),
          loadWorkspaceNotifications(user, pathname),
        ])
        if (!active) return
        notifContextRef.current = context
        setNotifications(items)
      } catch {
        if (!active) return
        setNotifications([])
      } finally {
        if (active) setNotifLoading(false)
      }
    }

    async function handleRealtimeEvent(payload: any) {
      const companyId = payload?.new?.company_id || payload?.old?.company_id || null
      if (!isNotificationEventRelevant(companyId, notifContextRef.current)) return

      const items = await loadWorkspaceNotifications(user, pathname)
      if (!active) return
      setNotifications(items)

      if (notificationBootedRef.current && items[0]) {
        playNotificationSound()
        maybeShowBrowserNotification(items[0])
      }
      notificationBootedRef.current = true
    }

    function enableRealtimeFeatures() {
      ensureAudioReady()
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {})
      }
    }

    const handleFirstPointerDown = () => enableRealtimeFeatures()

    run().then(() => {
      if (!active) return
      notificationBootedRef.current = true
      channel = supabase
        .channel(`workspace-notifs-${user.id}-${slug}-${resolvedShell}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests' }, handleRealtimeEvent)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, handleRealtimeEvent)
        .subscribe()

      window.addEventListener('pointerdown', handleFirstPointerDown, { once: true })
    })

    return () => {
      active = false
      if (channel) {
        supabase.removeChannel(channel)
      }
      window.removeEventListener('pointerdown', handleFirstPointerDown)
    }
  }, [user?.id, user?.company_id, pathname, slug, resolvedShell])

  useEffect(() => {
    if (!notifOpen || !user?.id) return
    const stamp = new Date().toISOString()
    const seenKey = `workspace_notifications_seen:${user.id}:${slug}:${resolvedShell}`
    localStorage.setItem(seenKey, stamp)
    setSeenAt(stamp)
  }, [notifOpen, user?.id, slug, resolvedShell])

  const isPlatformAdmin = user?.is_platform_admin === true
  const nav = useMemo(() => buildNav(slug, resolvedShell, isPlatformAdmin), [slug, resolvedShell, isPlatformAdmin])
  const sections = Array.from(new Set(nav.map((item) => item.section)))
  const titleMeta = shellTitle(resolvedShell)
  const currentLabel = nav.find((item) => pathname === item.href)?.label || titleMeta.title
  const brandName = settings?.company_name || user?.company_name || 'RSS'
  const brandColor = settings?.primary_color || '#2563EB'
  const latestNotifications = notifications.slice(0, 3)
  const unreadCount = notifications.filter((item) => {
    if (!seenAt) return true
    return new Date(item.occurredAt).getTime() > new Date(seenAt).getTime()
  }).length

  function markNotificationsSeen() {
    if (!user?.id) return
    const stamp = new Date().toISOString()
    localStorage.setItem(`workspace_notifications_seen:${user.id}:${slug}:${resolvedShell}`, stamp)
    setSeenAt(stamp)
  }

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
            <div ref={notifRef} className={`ws-notif ${notifOpen ? 'is-open' : ''}`}>
              <button
                className="ws-topbar-link ws-notif-trigger"
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                    Notification.requestPermission().catch(() => {})
                  }
                  const AudioCtor = window.AudioContext || (window as any).webkitAudioContext
                  if (AudioCtor && !audioContextRef.current) {
                    audioContextRef.current = new AudioCtor()
                  }
                  audioContextRef.current?.resume?.().catch(() => {})
                  setNotifOpen((value) => !value)
                }}
              >
                <Bell size={15} />
                <span>Notifications</span>
                {unreadCount > 0 && <span className="ws-notif-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>

              {notifOpen && (
                <div className="ws-notif-panel">
                  <div className="ws-notif-panel-head">
                    <div>
                      <div className="ws-notif-panel-title">Dernieres notifications</div>
                      <div className="ws-notif-panel-copy">
                        Demandes, tickets et mises a jour recentes du workspace.
                      </div>
                    </div>
                    <button className="ws-notif-mark" type="button" onClick={markNotificationsSeen}>
                      Tout lire
                    </button>
                  </div>

                  {notifLoading ? (
                    <div className="ws-notif-empty">Chargement...</div>
                  ) : notifications.length === 0 ? (
                    <div className="ws-notif-empty">Aucune notification recente.</div>
                  ) : (
                    <div className="ws-notif-list">
                      {notifications.map((item) => (
                        <Link
                          key={item.id}
                          href={item.href}
                          className={`ws-notif-item tone-${item.tone}`}
                          onClick={() => setNotifOpen(false)}
                        >
                          <div className="ws-notif-item-head">
                            <span className="ws-notif-kind">{item.kind === 'demande' ? 'Demande' : 'Ticket'}</span>
                            <span className="ws-notif-time">
                              <Clock3 size={12} />
                              <span>{formatNotificationTime(item.occurredAt)}</span>
                            </span>
                          </div>
                          <div className="ws-notif-item-title">{item.title}</div>
                          <div className="ws-notif-item-copy">{item.message}</div>
                          <div className="ws-notif-item-foot">
                            <span className="workspace-chip">{item.companyName}</span>
                            <ChevronRight size={14} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

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

        <div className="ws-notifbar">
          <div className="ws-notifbar-label">
            <BellRing size={14} />
            <span>Dernieres actus</span>
          </div>
          {latestNotifications.length === 0 ? (
            <div className="ws-notifbar-empty">Aucune notification recente pour le moment.</div>
          ) : (
            <div className="ws-notifbar-list">
              {latestNotifications.map((item) => (
                <Link key={item.id} href={item.href} className={`ws-notifbar-item tone-${item.tone}`}>
                  <span className="ws-notifbar-kind">{item.kind === 'demande' ? 'Demande' : 'Ticket'}</span>
                  <span className="ws-notifbar-text">{item.title}</span>
                  <span className="ws-notifbar-meta">{item.companyName}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <main className="ws-content">{children}</main>
      </div>
    </div>
  )
}
