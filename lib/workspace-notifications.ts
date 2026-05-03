import { supabase } from '@/lib/supabase'
import { loadOperationalScope } from '@/lib/workspace-client'

export type WorkspaceNotification = {
  id: string
  kind: 'demande' | 'ticket'
  title: string
  message: string
  status: string
  companyId: string
  companyName: string
  href: string
  occurredAt: string
  tone: 'accent' | 'warning' | 'success'
}

export type NotificationEventKind = 'create' | 'status_update' | 'other'

export type WorkspaceNotificationContext = {
  companyIds: string[]
  isCabinet: boolean
  slug: string
  routeBase: string
  companyLookup: Record<string, string>
}

function occurredAt(row: any) {
  return row?.updated_at || row?.created_at || new Date().toISOString()
}

function demandeMessage(status: string, isCabinet: boolean) {
  if (isCabinet) {
    if (status === 'pending') return 'Nouvelle demande client a traiter.'
    if (status === 'in_review') return "Demande en cours d'analyse."
    if (status === 'approved') return 'Demande validee, preparation a lancer.'
    if (status === 'in_progress') return 'Document ou service en preparation.'
    if (status === 'ready') return 'Demande prete a livrer au client.'
    if (status === 'delivered') return 'Demande livree au client.'
    if (status === 'rejected') return 'Demande refusee.'
    return 'Mise a jour sur une demande client.'
  }

  if (status === 'pending') return 'Votre demande a ete transmise au cabinet.'
  if (status === 'in_review') return 'Le cabinet analyse votre demande.'
  if (status === 'approved') return 'Votre demande a ete validee.'
  if (status === 'in_progress') return 'Le cabinet prepare votre demande.'
  if (status === 'ready') return 'Votre demande est prete.'
  if (status === 'delivered') return 'Votre demande a ete livree.'
  if (status === 'rejected') return 'Votre demande a ete refusee.'
  return 'Mise a jour sur votre demande.'
}

function ticketMessage(status: string, isCabinet: boolean) {
  if (isCabinet) {
    if (status === 'open') return 'Nouveau ticket a prendre en charge.'
    if (status === 'in_progress') return 'Ticket en cours de traitement.'
    if (status === 'waiting_client') return 'Le ticket attend un retour client.'
    if (status === 'resolved') return 'Ticket resolu, pret a cloturer.'
    if (status === 'closed') return 'Ticket cloture.'
    return 'Mise a jour sur un ticket client.'
  }

  if (status === 'open') return 'Votre ticket a ete recu.'
  if (status === 'in_progress') return 'Le cabinet traite votre ticket.'
  if (status === 'waiting_client') return 'Le cabinet attend votre retour.'
  if (status === 'resolved') return 'Votre ticket est resolu.'
  if (status === 'closed') return 'Votre ticket est cloture.'
  return 'Mise a jour sur votre ticket.'
}

function toneFromStatus(status: string): WorkspaceNotification['tone'] {
  if (['ready', 'delivered', 'resolved', 'closed'].includes(status)) return 'success'
  if (['pending', 'open', 'waiting_client'].includes(status)) return 'warning'
  return 'accent'
}

export async function loadWorkspaceNotificationContext(user: any, pathname: string): Promise<WorkspaceNotificationContext | null> {
  if (!user?.company_id) return null

  const scope = await loadOperationalScope(user.company_id, pathname)
  const isCabinet = scope.mode === 'cabinet' || user?.is_platform_admin === true
  const slug = pathname.split('/').filter(Boolean)[0] || ''
  const routeBase = `/${slug}/${isCabinet ? 'cabinet' : 'client'}`
  const companyLookup = Object.fromEntries(
    (scope.companies || []).map((company: any) => [company.id, company.name || company.slug || 'Client']),
  )

  return {
    companyIds: scope.companyIds,
    isCabinet,
    slug,
    routeBase,
    companyLookup,
  }
}

export function isNotificationEventRelevant(
  companyId: string | null | undefined,
  context: WorkspaceNotificationContext | null,
) {
  if (!companyId || !context) return false
  return context.companyIds.includes(companyId)
}

export function buildWorkspaceNotifications(
  context: WorkspaceNotificationContext,
  user: any,
  demandes: any[],
  tickets: any[],
) {
  const items: WorkspaceNotification[] = []

  for (const row of demandes || []) {
    items.push({
      id: `demande-${row.id}`,
      kind: 'demande',
      title: row.title || 'Demande',
      message: demandeMessage(row.status, context.isCabinet),
      status: row.status || 'pending',
      companyId: row.company_id,
      companyName: context.isCabinet ? (context.companyLookup[row.company_id] || 'Client') : (user.company_name || 'Votre entreprise'),
      href: `${context.routeBase}/demandes`,
      occurredAt: occurredAt(row),
      tone: toneFromStatus(row.status || 'pending'),
    })
  }

  for (const row of tickets || []) {
    items.push({
      id: `ticket-${row.id}`,
      kind: 'ticket',
      title: row.title || 'Ticket',
      message: ticketMessage(row.status, context.isCabinet),
      status: row.status || 'open',
      companyId: row.company_id,
      companyName: context.isCabinet ? (context.companyLookup[row.company_id] || 'Client') : (user.company_name || 'Votre entreprise'),
      href: `${context.routeBase}/tickets`,
      occurredAt: occurredAt(row),
      tone: toneFromStatus(row.status || 'open'),
    })
  }

  return items
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 12)
}

export function classifyRealtimeNotificationEvent(
  table: 'service_requests' | 'support_tickets',
  payload: any,
  context: WorkspaceNotificationContext,
) {
  const eventType = payload?.eventType || payload?.event || ''
  const nextRow = payload?.new || {}
  const prevRow = payload?.old || {}

  if (context.isCabinet) {
    if (eventType === 'INSERT') {
      return {
        shouldNotify: true,
        eventKind: 'create' as NotificationEventKind,
      }
    }

    return {
      shouldNotify: false,
      eventKind: 'other' as NotificationEventKind,
    }
  }

  if (eventType === 'UPDATE' && nextRow?.status && nextRow.status !== prevRow?.status) {
    return {
      shouldNotify: true,
      eventKind: 'status_update' as NotificationEventKind,
    }
  }

  if (table === 'service_requests' && eventType === 'INSERT' && nextRow?.created_by !== prevRow?.created_by) {
    return {
      shouldNotify: false,
      eventKind: 'other' as NotificationEventKind,
    }
  }

  return {
    shouldNotify: false,
    eventKind: 'other' as NotificationEventKind,
  }
}

export async function loadWorkspaceNotifications(user: any, pathname: string) {
  const context = await loadWorkspaceNotificationContext(user, pathname)
  if (!context) return []

  const [{ data: demandes, error: demandesError }, { data: tickets, error: ticketsError }] = await Promise.all([
    supabase
      .from('service_requests')
      .select('id,title,status,company_id,created_at,updated_at')
      .in('company_id', context.companyIds)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('support_tickets')
      .select('id,title,status,company_id,created_at,updated_at')
      .in('company_id', context.companyIds)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  if (demandesError && ticketsError) {
    return []
  }

  return buildWorkspaceNotifications(
    context,
    user,
    demandesError ? [] : (demandes || []),
    ticketsError ? [] : (tickets || []),
  )
}
