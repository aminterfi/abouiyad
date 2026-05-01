import { NextResponse } from 'next/server'
import { getCompanyBrandingBySlug } from '@/lib/company-branding'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const branding = await getCompanyBrandingBySlug(slug)
  const appName = branding.name
  const icon = branding.logoUrl || '/favicon.ico'

  const manifest = {
    name: appName,
    short_name: appName.slice(0, 12),
    description: `${appName} - Espace de gestion`,
    start_url: `/${slug}`,
    scope: `/${slug}/`,
    display: 'standalone',
    background_color: '#f5f4f1',
    theme_color: branding.primaryColor || '#2563EB',
    icons: [
      {
        src: icon,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: icon,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}

