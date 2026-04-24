'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SlugLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams() as { slug: string }
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function validate() {
      // 1. Vérifier que l'entreprise existe
      const { data: company } = await supabase.rpc('get_company_by_slug', { p_slug: slug })
      if (!company) {
        router.push('/')
        return
      }

      // 2. Page login du slug : accessible sans user
      const isLoginPage = pathname === `/${slug}`
      if (isLoginPage) {
        setLoading(false)
        return
      }

      // 3. Attendre un peu pour laisser le temps au localStorage
      await new Promise(r => setTimeout(r, 150))

      // 4. Vérifier user
      const u = localStorage.getItem('user')
      if (!u) {
        router.push(`/${slug}`)
        return
      }

      const parsed = JSON.parse(u)

      // 5. Vérifier que le user appartient à cette entreprise
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
  }, [slug, pathname])

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f4f1',color:'#a8a69e',fontFamily:'Outfit,sans-serif'}}>Chargement...</div>

  return <>{children}</>
}