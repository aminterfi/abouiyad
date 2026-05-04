import type { Metadata } from 'next'
import SlugLayoutClient from './SlugLayoutClient'
import { getCompanyBrandingBySlug } from '@/lib/company-branding'

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const branding = await getCompanyBrandingBySlug(slug)
  const appName = branding.name

  return {
    title: `${appName} | RSS`,
    applicationName: appName,
    manifest: `/${slug}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      title: appName,
      statusBarStyle: 'default',
    },
    icons: {
      icon: [{ url: `/${slug}/icon` }],
      shortcut: [{ url: `/${slug}/icon` }],
      apple: [{ url: `/${slug}/apple-icon` }],
    },
  }
}

export default async function SlugLayout({ children, params }: { children: React.ReactNode; params: Params }) {
  const { slug } = await params
  return <SlugLayoutClient slug={slug}>{children}</SlugLayoutClient>
}
