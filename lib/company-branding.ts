type CompanyBranding = {
  name: string
  logoUrl: string | null
  primaryColor: string
}

const FALLBACK: CompanyBranding = {
  name: 'RSS',
  logoUrl: null,
  primaryColor: '#2563EB',
}

function getEnv(name: string) {
  const v = process.env[name]
  return typeof v === 'string' && v.length > 0 ? v : null
}

export async function getCompanyBrandingBySlug(slug: string): Promise<CompanyBranding> {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!supabaseUrl || !anonKey || !slug) return FALLBACK

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

    if (!res.ok) return FALLBACK
    const data: any = await res.json()
    if (!data) return FALLBACK

    const name = String(data.name || data.company_name || slug || FALLBACK.name).trim() || FALLBACK.name
    const logoUrl = typeof data.logo_url === 'string' && data.logo_url.trim() ? data.logo_url.trim() : null
    const primaryColor = typeof data.primary_color === 'string' && data.primary_color.trim() ? data.primary_color.trim() : FALLBACK.primaryColor

    return { name, logoUrl, primaryColor }
  } catch {
    return FALLBACK
  }
}

