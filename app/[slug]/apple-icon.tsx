import { ImageResponse } from 'next/og'
import { getCompanyBrandingBySlug } from '@/lib/company-branding'

export const size = {
  width: 512,
  height: 512,
}

export const contentType = 'image/png'
export const dynamic = 'force-dynamic'

type Params = Promise<{ slug: string }>

export default async function AppleIcon({ params }: { params: Params }) {
  const { slug } = await params
  const branding = await getCompanyBrandingBySlug(slug)
  const letter = (branding.name || 'R').charAt(0).toUpperCase()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
        }}
      >
        {branding.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={branding.name}
            src={branding.logoUrl}
            style={{
              width: '82%',
              height: '82%',
              objectFit: 'contain',
            }}
          />
        ) : (
          <div
            style={{
              width: '82%',
              height: '82%',
              borderRadius: 80,
              background: branding.primaryColor || '#2563EB',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 280,
              fontWeight: 800,
              fontFamily: 'Arial',
            }}
          >
            {letter}
          </div>
        )}
      </div>
    ),
    size
  )
}

