'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardRedirect() {
  const router = useRouter()
  useEffect(() => {
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    const parsed = JSON.parse(u)
    if (parsed.slug) router.push(`/${parsed.slug}/dashboard`)
    else router.push('/')
  }, [])
  return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#a8a69e'}}>Redirection...</div>
}