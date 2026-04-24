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
      const isLoginPage = pathname === `/${slug}`
      
      const { data: company } = await supabase.rpc('get_company_by_slug', { p_slug: slug })
      if (!company) {
        router.push('/')
        return
      }

      if (isLoginPage) {
        setLoading(false)
        return
      }

      const u = localStorage.getItem('user')
      if (!u) {
        router.push(`/${slug}`)
        return
      }

      const parsed = JSON.parse(u)
      
      if (parsed.company_id !== company.id && !parsed.is_platform_admin) {
        alert('Accès non autorisé à cette entreprise')
        localStorage.removeItem('user')
        router.push(`/${slug}`)
        return
      }

      setLoading(false)
    }
    validate()
  }, [slug, pathname])

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f4f1',color:'#a8a69e',fontFamily:'Outfit,sans-serif'}}>Chargement...</div>

  return <>{children}</>
}