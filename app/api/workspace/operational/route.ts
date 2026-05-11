import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

type CreatePayload = {
  kind: 'ticket' | 'demande'
  companyId?: string
  createdBy?: string
  creatorEmail?: string | null
  title?: string
  description?: string | null
  priority?: string | null
  requestType?: string | null
  details?: string | null
}

async function resolveWorkspaceCreator(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  email: string,
  companyId: string,
) {
  const [userResult, ownerResult, membershipResult] = await Promise.all([
    userId
      ? admin.from('users').select('id').eq('id', userId).eq('company_id', companyId).maybeSingle()
      : admin.from('users').select('id').eq('id', '00000000-0000-0000-0000-000000000000').maybeSingle(),
    userId
      ? admin.from('owners').select('user_id').eq('user_id', userId).eq('company_id', companyId).maybeSingle()
      : admin.from('owners').select('user_id').eq('user_id', '00000000-0000-0000-0000-000000000000').maybeSingle(),
    userId
      ? admin.from('workspace_memberships').select('user_id').eq('user_id', userId).eq('company_id', companyId).maybeSingle()
      : admin.from('workspace_memberships').select('user_id').eq('user_id', '00000000-0000-0000-0000-000000000000').maybeSingle(),
  ])

  if (userResult.error && userResult.error.code !== 'PGRST116') throw userResult.error
  if (ownerResult.error && ownerResult.error.code !== 'PGRST116') throw ownerResult.error
  if (membershipResult.error && membershipResult.error.code !== 'PGRST116') throw membershipResult.error

  if (userResult.data?.id) return userResult.data.id
  if (ownerResult.data?.user_id) return ownerResult.data.user_id
  if (membershipResult.data?.user_id) return membershipResult.data.user_id

  if (email) {
    const [userByEmail, ownerByEmail] = await Promise.all([
      admin.from('users').select('id').eq('email', email).eq('company_id', companyId).maybeSingle(),
      admin.from('owners').select('user_id').eq('email', email).eq('company_id', companyId).maybeSingle(),
    ])

    if (userByEmail.error && userByEmail.error.code !== 'PGRST116') throw userByEmail.error
    if (ownerByEmail.error && ownerByEmail.error.code !== 'PGRST116') throw ownerByEmail.error

    if (userByEmail.data?.id) return userByEmail.data.id
    if (ownerByEmail.data?.user_id) return ownerByEmail.data.user_id
  }

  return null
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as CreatePayload
    const kind = body?.kind
    const companyId = String(body?.companyId || '')
    const createdBy = String(body?.createdBy || '')
    const creatorEmail = String(body?.creatorEmail || '').trim().toLowerCase()
    const title = String(body?.title || '').trim()

    if (!['ticket', 'demande'].includes(kind || '') || !companyId || !title || (!createdBy && !creatorEmail)) {
      return NextResponse.json({ error: 'Informations manquantes.' }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()
    const resolvedCreatorId = await resolveWorkspaceCreator(admin, createdBy, creatorEmail, companyId)
    if (!resolvedCreatorId) {
      return NextResponse.json({ error: 'Utilisateur non autorise pour cette entreprise.' }, { status: 403 })
    }

    if (kind === 'ticket') {
      const { data, error } = await admin.from('support_tickets').insert({
        title,
        description: String(body.description || '').trim() || null,
        priority: body.priority || 'normal',
        status: 'open',
        company_id: companyId,
        created_by: resolvedCreatorId,
      }).select('id').single()

      if (error) throw error
      return NextResponse.json({ id: data?.id || null })
    }

    const requestType = body.requestType || 'g12'
    const { data, error } = await admin.from('service_requests').insert({
      request_type: requestType,
      title,
      details: String(body.details || '').trim() || null,
      status: 'pending',
      requires_generated_document: requestType === 'g12' || requestType === 'auto_document',
      company_id: companyId,
      created_by: resolvedCreatorId,
    }).select('id').single()

    if (error) throw error
    return NextResponse.json({ id: data?.id || null })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Creation impossible.'
    return NextResponse.json(
      { error: message },
      { status: 500 },
    )
  }
}
