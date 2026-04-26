'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Cette page redirige simplement vers /hub
// Permet d'accéder au hub depuis n'importe quelle entreprise via /{slug}/hub
export default function SlugHubPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/hub')
  }, [])
  
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8f7f5',color:'#a8a69e',fontFamily:'Outfit,sans-serif'}}>
      Redirection vers le hub...
    </div>
  )
}