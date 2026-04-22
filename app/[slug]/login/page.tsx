'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function CompanyLoginPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params?.slug as string

  const [company, setCompany] = useState<any>(null)
  const [loadingCompany, setLoadingCompany] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [notFound, setNotFound] = useState(false)

  // ✅ If already logged → go to dashboard
  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) {
      router.push('/dashboard')
    }
  }, [])

  // ✅ Load company via slug
  useEffect(() => {
    if (slug) loadCompany()
  }, [slug])

  async function loadCompany() {
    setLoadingCompany(true)

    const { data, error } = await supabase.rpc('get_company_by_slug', {
      p_slug: slug,
    })

    if (error || !data) {
      setNotFound(true)
      setLoadingCompany(false)
      return
    }

    setCompany(data)
    setLoadingCompany(false)
  }

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!company?.id) throw new Error('Entreprise introuvable')

      // 🔒 Check subscription
      if (company.sub_status === 'cancelled' || company.sub_status === 'expired') {
        throw new Error('Entreprise suspendue. Contactez RS Comptabilité.')
      }

      const { data, error: fnErr } = await supabase.rpc('login_employee', {
        p_username: username.trim(),
        p_password: password,
        p_company_id: company.id,
      })

      if (fnErr) throw fnErr
      if (!data) throw new Error('Identifiants incorrects')

      // ✅ Save session
      localStorage.setItem('user', JSON.stringify({
        ...data,
        type: 'employee',
        company_id: company.id,
        slug: slug
      }))

      router.push('/dashboard')

    } catch (err: any) {
      setError(err.message || 'Erreur de connexion')
    }

    setLoading(false)
  }

  // ⏳ Loading
  if (loadingCompany) {
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
        Chargement...
      </div>
    )
  }

  // ❌ Not found
  if (notFound) {
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{textAlign:'center'}}>
          <h2>Entreprise introuvable</h2>
          <p>/{slug} n'existe pas</p>
        </div>
      </div>
    )
  }

  const primaryColor = company.primary_color || '#2563EB'

  return (
    <div style={{
      minHeight:'100vh',
      display:'flex',
      alignItems:'center',
      justifyContent:'center',
      background:`linear-gradient(135deg, ${primaryColor}08, ${primaryColor}20)`
    }}>
      <div style={{width:'100%',maxWidth:420}}>

        {/* COMPANY */}
        <div style={{textAlign:'center',marginBottom:30}}>
          <div style={{
            width:70,height:70,borderRadius:16,
            background:primaryColor,
            color:'#fff',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:28,fontWeight:800,
            margin:'0 auto 10px'
          }}>
            {company.name.charAt(0)}
          </div>

          <h2>{company.name}</h2>
          <p style={{fontSize:12,color:'#666'}}>Espace employés</p>
        </div>

        {/* FORM */}
        <form onSubmit={login} style={{
          background:'#fff',
          padding:25,
          borderRadius:12,
          boxShadow:'0 10px 30px rgba(0,0,0,0.08)'
        }}>

          {error && (
            <div style={{
              background:'#fee',
              color:'#c00',
              padding:10,
              marginBottom:10,
              borderRadius:6,
              fontSize:12
            }}>
              {error}
            </div>
          )}

          <input
            type="text"
            placeholder="Nom d'utilisateur"
            value={username}
            onChange={e=>setUsername(e.target.value)}
            required
            style={{width:'100%',padding:12,marginBottom:10,border:'1px solid #ddd',borderRadius:6}}
          />

          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            required
            style={{width:'100%',padding:12,marginBottom:15,border:'1px solid #ddd',borderRadius:6}}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width:'100%',
              padding:12,
              background:primaryColor,
              color:'#fff',
              border:'none',
              borderRadius:6,
              cursor:'pointer'
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

        </form>

        <div style={{textAlign:'center',marginTop:15,fontSize:11,color:'#888'}}>
          RSS · RS Comptabilité © 2026
        </div>
      </div>
    </div>
  )
}