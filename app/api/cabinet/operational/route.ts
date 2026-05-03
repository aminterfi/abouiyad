import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const runtime = 'nodejs'

async function loadCabinetCompanies(admin: ReturnType<typeof createAdminSupabaseClient>, slug: string) {
  const { data: cabinet, error: cabinetError } = await admin
    .from('companies')
    .select('id,name,slug')
    .eq('slug', slug)
    .maybeSingle()

  if (cabinetError || !cabinet) {
    throw new Error('Cabinet introuvable')
  }

  const { data: companies, error: companiesError } = await admin
    .from('companies')
    .select('id,name,slug')
    .neq('id', (cabinet as any).id)
    .neq('slug', slug)
    .order('name', { ascending: true })

  if (companiesError) throw companiesError

  const ids = ((companies as any[]) || []).map((company) => company.id).filter(Boolean)
  const { data: modules } = ids.length
    ? await admin
        .from('company_module_access')
        .select('company_id,module_key,is_enabled')
        .in('company_id', ids)
        .eq('is_enabled', true)
    : { data: [] as any[] }

  const moduleMap: Record<string, string[]> = {}
  for (const row of (modules as any[]) || []) {
    if (!moduleMap[row.company_id]) moduleMap[row.company_id] = []
    moduleMap[row.company_id].push(row.module_key)
  }

  return {
    cabinet,
    companies: ((companies as any[]) || []).map((company) => ({
      ...company,
      owner_email: null,
      active_modules: moduleMap[company.id] || [],
    })),
  }
}

function aggregateByCompany(rows: any[], key = 'company_id') {
  const map: Record<string, any[]> = {}
  for (const row of rows || []) {
    const id = row?.[key]
    if (!id) continue
    if (!map[id]) map[id] = []
    map[id].push(row)
  }
  return map
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const kind = searchParams.get('kind')
    const slug = searchParams.get('slug') || 'rs'

    const admin = createAdminSupabaseClient()
    const { companies } = await loadCabinetCompanies(admin, slug)
    const companyIds = companies.map((company) => company.id)

    if (kind === 'summary') {
      if (companyIds.length === 0) {
        return NextResponse.json({
          totalClients: 0,
          totalDemandes: 0,
          pendingDemandes: 0,
          totalTickets: 0,
          openTickets: 0,
          totalDocuments: 0,
          companies,
        })
      }

      const [{ data: demandes }, { data: tickets }, { count: totalDocuments }] = await Promise.all([
        admin.from('service_requests').select('id,status,company_id').in('company_id', companyIds),
        admin.from('support_tickets').select('id,status,company_id').in('company_id', companyIds),
        admin.from('document_archive_files').select('*', { count: 'exact', head: true }).in('company_id', companyIds),
      ])

      return NextResponse.json({
        totalClients: companies.length,
        totalDemandes: (demandes || []).length,
        pendingDemandes: (demandes || []).filter((row: any) => ['pending', 'in_review', 'approved', 'in_progress'].includes(row.status)).length,
        totalTickets: (tickets || []).length,
        openTickets: (tickets || []).filter((row: any) => ['open', 'in_progress', 'waiting_client'].includes(row.status)).length,
        totalDocuments: totalDocuments || 0,
        companies,
      })
    }

    if (kind === 'clients') {
      if (companyIds.length === 0) {
        return NextResponse.json({ companies: [] })
      }

      const [{ data: demandes }, { data: tickets }, { data: bills }] = await Promise.all([
        admin.from('service_requests').select('company_id').in('company_id', companyIds),
        admin.from('support_tickets').select('company_id').in('company_id', companyIds),
        admin.from('bills').select('company_id,total_amount,paid_amount,status').in('company_id', companyIds).eq('is_archived', false),
      ])

      const demandesMap = aggregateByCompany(demandes || [])
      const ticketsMap = aggregateByCompany(tickets || [])
      const billsMap = aggregateByCompany(bills || [])

      const enriched = companies.map((company) => {
        const companyBills = billsMap[company.id] || []
        const totals = companyBills.reduce((acc, bill) => {
          acc.total += Number(bill.total_amount || 0)
          acc.paid += Number(bill.paid_amount || 0)
          return acc
        }, { total: 0, paid: 0 })

        return {
          ...company,
          demandes: (demandesMap[company.id] || []).length,
          tickets: (ticketsMap[company.id] || []).length,
          billed: totals.total,
          paid: totals.paid,
        }
      })

      return NextResponse.json({ companies: enriched })
    }

    if (kind === 'demandes') {
      const { data } = companyIds.length
        ? await admin.from('service_requests').select('*').in('company_id', companyIds).order('created_at', { ascending: false })
        : { data: [] as any[] }

      return NextResponse.json({ rows: data || [], companies })
    }

    if (kind === 'tickets') {
      const { data } = companyIds.length
        ? await admin.from('support_tickets').select('*').in('company_id', companyIds).order('created_at', { ascending: false })
        : { data: [] as any[] }

      return NextResponse.json({ rows: data || [], companies })
    }

    return NextResponse.json({ error: 'Unsupported kind' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Operational API failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const slug = String(body?.slug || 'rs')
    const kind = String(body?.kind || '')
    const id = String(body?.id || '')
    const payload = body?.payload || {}

    if (!id || !['demande', 'ticket'].includes(kind)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()
    await loadCabinetCompanies(admin, slug)

    const table = kind === 'demande' ? 'service_requests' : 'support_tickets'
    const { data, error } = await admin.from(table).update(payload).eq('id', id).select().maybeSingle()
    if (error) throw error

    return NextResponse.json({ ok: true, row: data })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Operational update failed' }, { status: 500 })
  }
}
