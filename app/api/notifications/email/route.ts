import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

type EmailRequest = {
  scope: 'cabinet' | 'client'
  kind: 'demande' | 'ticket'
  action: 'created' | 'status_updated'
  companyId: string
  title: string
  status?: string | null
  actorName?: string | null
}

function friendlyKind(kind: EmailRequest['kind']) {
  return kind === 'demande' ? 'demande' : 'ticket'
}

function friendlyStatus(status?: string | null) {
  if (!status) return 'mise a jour'
  const map: Record<string, string> = {
    pending: 'Nouvelle',
    in_review: 'En analyse',
    approved: 'Validee',
    in_progress: 'En preparation',
    ready: 'Prete',
    delivered: 'Livree',
    rejected: 'Refusee',
    open: 'Ouvert',
    waiting_client: 'En attente client',
    resolved: 'Resolue',
    closed: 'Fermee',
  }
  return map[status] || status
}

function buildEmailContent(payload: EmailRequest, companyName: string) {
  const kind = friendlyKind(payload.kind)
  if (payload.scope === 'cabinet') {
    return {
      subject: `Nouvelle ${kind} client - ${companyName}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h2 style="margin:0 0 12px">Nouvelle ${kind} client</h2>
          <p><strong>Entreprise :</strong> ${companyName}</p>
          <p><strong>Titre :</strong> ${payload.title}</p>
          ${payload.actorName ? `<p><strong>Envoye par :</strong> ${payload.actorName}</p>` : ''}
          <p>Une nouvelle ${kind} vient d'etre soumise dans l'application.</p>
        </div>
      `,
    }
  }

  return {
    subject: `Mise a jour de votre ${kind} - ${companyName}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2 style="margin:0 0 12px">Mise a jour de votre ${kind}</h2>
        <p><strong>Entreprise :</strong> ${companyName}</p>
        <p><strong>Titre :</strong> ${payload.title}</p>
        <p><strong>Statut :</strong> ${friendlyStatus(payload.status)}</p>
        <p>Le cabinet a mis a jour votre ${kind}. Ouvrez votre espace client pour voir le detail.</p>
      </div>
    `,
  }
}

async function getRecipients(admin: any, payload: EmailRequest) {
  const targetCompanyId = payload.scope === 'cabinet'
    ? await (async () => {
      const { data } = await admin.from('companies').select('id').eq('slug', 'rs').maybeSingle()
      return (data as any)?.id || null
    })()
    : payload.companyId

  if (!targetCompanyId) return []

  const [{ data: settings }, { data: owners }] = await Promise.all([
    admin.from('settings').select('email').eq('company_id', targetCompanyId).maybeSingle(),
    admin.from('owners').select('email').eq('company_id', targetCompanyId),
  ])

  const emails = new Set<string>()
  const push = (value?: string | null) => {
    const email = String(value || '').trim().toLowerCase()
    if (email && email.includes('@')) emails.add(email)
  }

  push((settings as any)?.email)
  for (const owner of (owners as any[]) || []) push(owner?.email)

  return Array.from(emails)
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const resendApiKey = process.env.RESEND_API_KEY
    const resendFromEmail = process.env.RESEND_FROM_EMAIL

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !resendFromEmail) {
      return NextResponse.json({ ok: false, error: 'Email env missing' }, { status: 503 })
    }

    const payload = await request.json() as EmailRequest
    if (!payload?.companyId || !payload?.title || !payload?.kind || !payload?.scope || !payload?.action) {
      return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: company } = await admin
      .from('companies')
      .select('id,name')
      .eq('id', payload.companyId)
      .maybeSingle()

    const companyName = (company as any)?.name || 'Entreprise'
    const recipients = await getRecipients(admin, payload)

    if (!recipients.length) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'No recipients' })
    }

    const email = buildEmailContent(payload, companyName)
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: recipients,
        subject: email.subject,
        html: email.html,
      }),
    })

    if (!resendResponse.ok) {
      const body = await resendResponse.text()
      return NextResponse.json({ ok: false, error: body }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Email send failed' }, { status: 500 })
  }
}
