'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SlugLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams() as { slug: string }
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)

  function cleanupStaleBackdrops() {
    if (typeof document === 'undefined') return
    document.body.style.overflow = ''
    const overlays = Array.from(document.querySelectorAll('div[style*="position: fixed"][style*="inset: 0"]'))
    for (const node of overlays) {
      const el = node as HTMLDivElement
      if (el.dataset.uiOverlay === 'mobile-nav') continue
      const bg = el.style.background || ''
      if (!bg.includes('rgba(0,0,0')) continue
      el.remove()
    }
  }

  useEffect(() => {
    async function validate() {
      cleanupStaleBackdrops()

      const { data: company } = await supabase.rpc('get_company_by_slug', { p_slug: slug })
      if (!company) {
        router.push('/')
        return
      }

      const isLoginPage = pathname === `/${slug}`
      if (isLoginPage) {
        setLoading(false)
        return
      }

      await new Promise(r => setTimeout(r, 150))

      const u = localStorage.getItem('user')
      if (!u) {
        router.push(`/${slug}`)
        return
      }

      const parsed = JSON.parse(u)
      if (parsed.company_id !== company.id && !parsed.is_platform_admin) {
        if (parsed.slug && parsed.slug !== slug) {
          router.push(`/${parsed.slug}/dashboard`)
        } else {
          localStorage.removeItem('user')
          router.push(`/${slug}`)
        }
        return
      }

      setLoading(false)
    }
    validate()
  }, [slug, pathname, router])

  useEffect(() => {
    cleanupStaleBackdrops()
    const t = setTimeout(cleanupStaleBackdrops, 300)
    return () => clearTimeout(t)
  }, [pathname])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f4f1', color: '#a8a69e', fontFamily: 'Outfit,sans-serif' }}>
        Chargement...
      </div>
    )
  }

  return <>{children}</>
}
