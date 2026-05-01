import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCompanyWorkspaceBySlug } from '@/lib/company-workspace'
import { getLegacyDashboardRedirect } from '@/lib/workspace'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const parts = pathname.split('/').filter(Boolean)
  const dashboardIndex = parts.indexOf('dashboard')

  if (dashboardIndex !== 1 || parts.length < 2) {
    return NextResponse.next()
  }

  const slug = parts[0]
  const suffixParts = parts.slice(dashboardIndex + 1)
  const workspace = await getCompanyWorkspaceBySlug(slug, 'client')
  const target = getLegacyDashboardRedirect(
    slug,
    suffixParts,
    workspace?.workspaceType || 'client',
  )

  if (target === pathname) {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.pathname = target
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/:slug/dashboard/:path*'],
}
