import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

type ResetPayload = {
  email?: string
  slug?: string | null
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as ResetPayload
    const email = String(body?.email || '').trim().toLowerCase()
    const slug = String(body?.slug || '').trim().toLowerCase()

    if (!email) {
      return NextResponse.json({ error: 'Email requis.' }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()

    let companyId: string | null = null
    if (slug) {
      const { data: company, error: companyError } = await admin
        .from('companies')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()

      if (companyError) throw companyError
      companyId = company?.id || null
    }

    let ownerQuery = admin
      .from('owners')
      .select('email')
      .eq('email', email)

    if (companyId) {
      ownerQuery = ownerQuery.eq('company_id', companyId)
    }

    const { data: owner, error: ownerError } = await ownerQuery.maybeSingle()
    if (ownerError && ownerError.code !== 'PGRST116') throw ownerError

    if (owner?.email) {
      const origin = new URL(request.url).origin
      const redirectUrl = new URL('/reset-password', origin)
      if (slug) {
        redirectUrl.searchParams.set('slug', slug)
      }

      const { error: resetError } = await admin.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl.toString(),
      })

      if (resetError) throw resetError
    }

    return NextResponse.json({
      ok: true,
      message: 'Si ce proprietaire existe, un email de reinitialisation a ete envoye.',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Reinitialisation impossible.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
