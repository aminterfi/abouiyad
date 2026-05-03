import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const runtime = 'nodejs'

function routeBase(slug: string, shell: string, kind: string) {
  const zone = shell === 'cabinet' ? 'cabinet' : 'client'
  return `/${slug}/${zone}/${kind === 'demande' ? 'demandes' : 'tickets'}`
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug') || 'rs'
    const shell = searchParams.get('shell') || 'client'
    const companyId = searchParams.get('companyId') || ''

    const admin = createAdminSupabaseClient()
    let companyIds: string[] = []

    if (shell === 'cabinet') {
      const { data: cabinet } = await admin.from('companies').select('id').eq('slug', slug).maybeSingle()
      const cabinetId = (cabinet as any)?.id
      if (cabinetId) {
        const { data: companies } = await admin.from('companies').select('id').neq('id', cabinetId).neq('slug', slug)
        companyIds = ((companies as any[]) || []).map((row) => row.id).filter(Boolean)
      }
    } else if (companyId) {
      companyIds = [companyId]
    }

    if (!companyIds.length) {
      return NextResponse.json({ notifications: [] })
    }

    const { data, error } = await admin
      .from('workspace_notifications')
      .select('*')
      .in('company_id', companyIds)
      .eq('audience', shell === 'cabinet' ? 'cabinet' : 'client')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    return NextResponse.json({
      notifications: ((data as any[]) || []).map((row) => ({
        id: row.id,
        kind: row.kind,
        title: row.title,
        message: row.message,
        status: row.status || '',
        companyId: row.company_id,
        companyName: shell === 'cabinet' ? 'Client' : 'Votre entreprise',
        href: routeBase(slug, shell, row.kind),
        occurredAt: row.created_at,
        tone: ['ready', 'delivered', 'resolved', 'closed'].includes(row.status) ? 'success' : ['pending', 'open', 'waiting_client'].includes(row.status) ? 'warning' : 'accent',
      })),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Notifications unavailable' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const admin = createAdminSupabaseClient()
    const payload = {
      company_id: body.companyId,
      audience: body.audience,
      kind: body.kind,
      entity_id: body.entityId || null,
      title: body.title,
      message: body.message,
      status: body.status || null,
    }

    const { error } = await admin.from('workspace_notifications').insert(payload)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Notification create failed' }, { status: 500 })
  }
}
