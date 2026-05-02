import { detectWorkspaceType, enforceWorkspaceTypeForSlug, type WorkspaceType } from '@/lib/workspace'

export type CompanyWorkspaceRecord = {
  id: string | null
  slug: string
  name: string
  workspaceType: WorkspaceType
  parentCabinetId: string | null
  logoUrl: string | null
  primaryColor: string | null
}

function getEnv(name: string) {
  const v = process.env[name]
  return typeof v === 'string' && v.length > 0 ? v : null
}

export async function getCompanyWorkspaceBySlug(slug: string, fallbackType: WorkspaceType = 'client'): Promise<CompanyWorkspaceRecord | null> {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!supabaseUrl || !anonKey || !slug) return null

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_company_by_slug`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_slug: slug }),
      cache: 'no-store',
    })

    if (!res.ok) return null
    const data: any = await res.json()
    if (!data) return null

    return {
      id: data.id || null,
      slug: String(data.slug || slug),
      name: String(data.name || data.company_name || slug),
      workspaceType: enforceWorkspaceTypeForSlug(
        String(data.slug || slug),
        detectWorkspaceType(data, fallbackType),
      ),
      parentCabinetId: data.parent_cabinet_id || null,
      logoUrl: typeof data.logo_url === 'string' && data.logo_url.trim() ? data.logo_url.trim() : null,
      primaryColor: typeof data.primary_color === 'string' && data.primary_color.trim() ? data.primary_color.trim() : null,
    }
  } catch {
    return null
  }
}
