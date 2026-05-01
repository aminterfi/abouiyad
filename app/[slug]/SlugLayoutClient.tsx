'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getDefaultWorkspacePath, getLegacyDashboardRedirect, normalizeWorkspaceSession } from '@/lib/workspace'

export default function SlugLayoutClient({ slug, children }: { slug: string; children: React.ReactNode }) {
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

      const parsed = normalizeWorkspaceSession(JSON.parse(u))
      if (parsed.company_id !== company.id && !parsed.is_platform_admin) {
        if (parsed.slug && parsed.slug !== slug) {
          router.push(getDefaultWorkspacePath(parsed, parsed.slug))
        } else {
          localStorage.removeItem('user')
          router.push(`/${slug}`)
        }
        return
      }

      const isAdminRsPath = pathname.startsWith(`/${slug}/admin-rs`)
      const isCabinetPath = pathname.startsWith(`/${slug}/cabinet`)
      const isClientPath = pathname.startsWith(`/${slug}/client`)
      const isLegacyDashboardPath = pathname.startsWith(`/${slug}/dashboard`)

      if (isAdminRsPath && !parsed.is_platform_admin) {
        router.replace(getDefaultWorkspacePath(parsed, slug))
        return
      }

      if (isCabinetPath && !parsed.is_platform_admin && parsed.workspace_type !== 'cabinet') {
        router.replace(getDefaultWorkspacePath(parsed, slug))
        return
      }

      if (isClientPath && !parsed.is_platform_admin && parsed.workspace_type !== 'client') {
        router.replace(getDefaultWorkspacePath(parsed, slug))
        return
      }

      if (isLegacyDashboardPath) {
        const suffix = pathname.replace(`/${slug}/dashboard`, '').split('/').filter(Boolean)
        router.replace(getLegacyDashboardRedirect(slug, suffix, parsed.workspace_type, parsed.is_platform_admin))
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
