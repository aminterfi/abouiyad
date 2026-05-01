import type { Metadata } from 'next'
import SlugLayoutClient from './SlugLayoutClient'
import { getCompanyBrandingBySlug } from '@/lib/company-branding'

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const branding = await getCompanyBrandingBySlug(slug)
  const appName = branding.name
  const icon = branding.logoUrl || '/favicon.ico'

  return {
    title: `${appName} | RSS`,
    applicationName: appName,
    manifest: `/${slug}/manifest.webmanifest`,
    icons: {
      icon: [{ url: icon }],
      shortcut: [{ url: icon }],
      apple: [{ url: icon }],
    },
  }
}

export default async function SlugLayout({ children, params }: { children: React.ReactNode; params: Params }) {
  const { slug } = await params
  return <SlugLayoutClient slug={slug}>{children}</SlugLayoutClient>
}

