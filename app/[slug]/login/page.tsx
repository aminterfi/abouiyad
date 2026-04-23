'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function CompanyLoginPage() {
  const { slug } = useParams() as { slug: string }
  const router = useRouter()
  const [company, setCompany] = useState<any>(null)
  const [loadingCompany, setLoadingCompany] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (!slug) return
    supabase.rpc('get_company_by_slug', { p_slug: slug }).then(({ data }) => {
      setCompany(data)
      setLoadingCompany(false)
    })
  }, [slug])

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (!company?.id) throw new Error('Entreprise introuvable')
      if (company.sub_status === 'cancelled' || company.sub_status === 'expired') {
        throw new Error('Abonnement suspendu. Contactez RS Comptabilité.')
      }
      const { data, error: err } = await supabase.rpc('login_employee', {
        p_username: username.trim(), p_password: password, p_company_id: company.id,
      })
      if (err || !data) throw new Error('Identifiants incorrects')
      localStorage.setItem('user', JSON.stringify({ ...data, type: 'employee', slug }))
      router.push('/dashboard')
    } catch (err: any) { setError(err.message) }
    setLoading(false)
  }

  if (loadingCompany) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8f7f5',color:'#a8a69e'}}>Chargement...</div>

  if (!company) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'#f8f7f5',fontFamily:'Outfit,sans-serif'}}>
      <div style={{textAlign:'center',maxWidth:440}}>
        <div style={{fontSize:64,marginBottom:12}}>🔍</div>
        <div style={{fontSize:22,fontWeight:700,marginBottom:8}}>Entreprise introuvable</div>
        <div style={{fontSize:13,color:'#6b6860',marginBottom:20}}>Le lien <code style={{background:'#fff',padding:'2px 8px',borderRadius:4}}>/{slug}</code> n'existe pas.</div>
        <a href="/" style={{padding:'10px 18px',background:'#2563EB',color:'#fff',borderRadius:8,textDecoration:'none',fontSize:13,fontWeight:600}}>Retour</a>
      </div>
    </div>
  )

  const c = company.primary_color || '#2563EB'

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:`linear-gradient(135deg,${c}0a,${c}18)`,fontFamily:'Outfit,sans-serif'}}>
      <div style={{width:'100%',maxWidth:420}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          {company.logo_url ? (
            <div style={{width:84,height:84,borderRadius:20,background:'#fff',display:'inline-flex',alignItems:'center',justifyContent:'center',boxShadow:'0 12px 30px rgba(0,0,0,0.12)',marginBottom:16,padding:12}}>
              <img src={company.logo_url} alt={company.name} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/>
            </div>
          ) : (
            <div style={{width:84,height:84,borderRadius:20,background:`linear-gradient(135deg,${c},${c}dd)`,display:'inline-flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:36,fontWeight:800,boxShadow:`0 12px 30px ${c}40`,marginBottom:16}}>
              {company.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{fontSize:26,fontWeight:800,letterSpacing:'-.5px'}}>{company.name}</div>
          <div style={{fontSize:13,color:'#6b6860',marginTop:4}}>Espace employés</div>
        </div>

        <div style={{background:'#fff',borderRadius:16,padding:28,boxShadow:'0 10px 40px rgba(0,0,0,0.08)',border:'1px solid rgba(0,0,0,0.06)'}}>
          {error && <div style={{background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#dc2626',marginBottom:14}}>{error}</div>}
          <form onSubmit={login}>
            <label style={{fontSize:12,color:'#6b6860',marginBottom:6,display:'block'}}>Nom d'utilisateur</label>
            <input required autoFocus value={username} onChange={e=>setUsername(e.target.value)} placeholder="prenom.nom"
              style={{width:'100%',padding:'11px 14px',fontSize:14,border:'1px solid rgba(0,0,0,0.14)',borderRadius:8,background:'#f8f7f5',marginBottom:14,outline:'none',fontFamily:'inherit'}}/>
            <label style={{fontSize:12,color:'#6b6860',marginBottom:6,display:'block'}}>Mot de passe</label>
            <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"
              style={{width:'100%',padding:'11px 14px',fontSize:14,border:'1px solid rgba(0,0,0,0.14)',borderRadius:8,background:'#f8f7f5',marginBottom:18,outline:'none',fontFamily:'inherit'}}/>
            <button type="submit" disabled={loading}
              style={{width:'100%',padding:14,fontSize:14,fontWeight:600,background:loading?'#a8a69e':`linear-gradient(135deg,${c},${c}dd)`,color:'#fff',border:'none',borderRadius:8,cursor:loading?'not-allowed':'pointer',fontFamily:'inherit',boxShadow:`0 4px 14px ${c}40`}}>
              {loading?'Connexion...':'Se connecter'}
            </button>
          </form>
        </div>

        <div style={{textAlign:'center',marginTop:18,fontSize:11,color:'#a8a69e'}}>
          Propulsé par <strong style={{color:'#6b6860'}}>RSS</strong> · <strong style={{color:'#6b6860'}}>RS Comptabilité</strong><br/>
          <span style={{fontSize:10}}>Tous droits réservés © 2026</span>
        </div>
      </div>
    </div>
  )
}