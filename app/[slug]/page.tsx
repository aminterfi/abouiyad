'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function CompanyLoginPage() {
  const { slug } = useParams() as { slug: string }
  const router = useRouter()
  const [mode, setMode] = useState<'employee' | 'owner'>('employee')
  const [company, setCompany] = useState<any>(null)
  const [loadingCompany, setLoadingCompany] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (!slug) return
    supabase.rpc('get_company_by_slug', { p_slug: slug }).then(({ data }) => {
      if (!data) setNotFound(true)
      else setCompany(data)
      setLoadingCompany(false)
    })
  }, [slug])

  async function loginOwner(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: ownerEmail.trim(), password: ownerPassword,
      })
      if (authErr) throw authErr
      const { data: owner } = await supabase.rpc('get_owner_info', { p_user_id: auth.user!.id })
      if (!owner) throw new Error('Aucune entreprise liée à ce compte')
      if (owner.company_id !== company.id && !owner.is_platform_admin) {
        await supabase.auth.signOut()
        throw new Error('Vous n\'êtes pas propriétaire de cette entreprise')
      }
      const { data: sub } = await supabase.rpc('get_company_subscription', { p_company_id: owner.company_id })
      if (!owner.is_platform_admin && (sub?.status === 'cancelled' || sub?.status === 'expired')) {
        await supabase.auth.signOut()
        throw new Error('Abonnement suspendu')
      }
      localStorage.setItem('user', JSON.stringify({
        id: auth.user!.id, email: auth.user!.email, full_name: owner.full_name,
        role: 'owner', company_id: owner.company_id, company_name: owner.company_name,
        is_platform_admin: owner.is_platform_admin, type: 'owner',
      }))
      if (sub) localStorage.setItem('subscription', JSON.stringify(sub))
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect' : err.message)
    }
    setLoading(false)
  }

  async function loginEmployee(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      if (company.sub_status === 'cancelled' || company.sub_status === 'expired') {
        throw new Error('Abonnement suspendu. Contactez RS Comptabilité.')
      }
      const { data } = await supabase.rpc('login_employee', {
        p_username: username.trim(), p_password: password, p_company_id: company.id,
      })
      if (!data) throw new Error('Identifiants incorrects')
      localStorage.setItem('user', JSON.stringify({ ...data, type: 'employee', slug }))
      router.push('/dashboard')
    } catch (err: any) { setError(err.message) }
    setLoading(false)
  }

  if (loadingCompany) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8f7f5',color:'#a8a69e'}}>Chargement...</div>

  if (notFound) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'#f8f7f5',fontFamily:'Outfit,sans-serif'}}>
      <div style={{textAlign:'center',maxWidth:440}}>
        <div style={{fontSize:64,marginBottom:12}}>🔍</div>
        <div style={{fontSize:22,fontWeight:700,marginBottom:8}}>Entreprise introuvable</div>
        <div style={{fontSize:13,color:'#6b6860',marginBottom:20}}>Le lien <code style={{background:'#fff',padding:'2px 8px',borderRadius:4}}>/{slug}</code> n'existe pas.</div>
        <Link href="/" style={{padding:'10px 18px',background:'#2563EB',color:'#fff',borderRadius:8,textDecoration:'none',fontSize:13,fontWeight:600}}>Retour à l'accueil</Link>
      </div>
    </div>
  )

  const c = company.primary_color || '#2563EB'

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:`linear-gradient(135deg,${c}0a,${c}18)`,fontFamily:'Outfit,sans-serif'}}>
      <div style={{width:'100%',maxWidth:440}}>
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
          <div style={{fontSize:13,color:'#6b6860',marginTop:4}}>Accès à votre espace</div>
        </div>

        <div style={{background:'#fff',borderRadius:16,padding:28,boxShadow:'0 10px 40px rgba(0,0,0,0.08)',border:'1px solid rgba(0,0,0,0.06)'}}>
          <div style={{background:'#f0eeea',borderRadius:10,padding:4,display:'flex',marginBottom:20}}>
            <button onClick={()=>{setMode('employee');setError('')}}
              style={{flex:1,padding:10,borderRadius:7,fontSize:13,cursor:'pointer',border:'none',fontFamily:'inherit',fontWeight:mode==='employee'?600:500,background:mode==='employee'?'#fff':'transparent',color:mode==='employee'?'#1a1916':'#6b6860',boxShadow:mode==='employee'?'0 2px 6px rgba(0,0,0,0.06)':'none'}}>
              👤 Employé
            </button>
            <button onClick={()=>{setMode('owner');setError('')}}
              style={{flex:1,padding:10,borderRadius:7,fontSize:13,cursor:'pointer',border:'none',fontFamily:'inherit',fontWeight:mode==='owner'?600:500,background:mode==='owner'?'#fff':'transparent',color:mode==='owner'?'#1a1916':'#6b6860',boxShadow:mode==='owner'?'0 2px 6px rgba(0,0,0,0.06)':'none'}}>
              🏢 Propriétaire
            </button>
          </div>

          {error && <div style={{background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#dc2626',marginBottom:14}}>{error}</div>}

          {mode==='employee' ? (
            <form onSubmit={loginEmployee}>
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
          ) : (
            <form onSubmit={loginOwner}>
              <label style={{fontSize:12,color:'#6b6860',marginBottom:6,display:'block'}}>Email professionnel</label>
              <input type="email" required autoFocus value={ownerEmail} onChange={e=>setOwnerEmail(e.target.value)} placeholder="contact@..."
                style={{width:'100%',padding:'11px 14px',fontSize:14,border:'1px solid rgba(0,0,0,0.14)',borderRadius:8,background:'#f8f7f5',marginBottom:14,outline:'none',fontFamily:'inherit'}}/>
              <label style={{fontSize:12,color:'#6b6860',marginBottom:6,display:'block'}}>Mot de passe</label>
              <input type="password" required value={ownerPassword} onChange={e=>setOwnerPassword(e.target.value)} placeholder="••••••••"
                style={{width:'100%',padding:'11px 14px',fontSize:14,border:'1px solid rgba(0,0,0,0.14)',borderRadius:8,background:'#f8f7f5',marginBottom:18,outline:'none',fontFamily:'inherit'}}/>
              <button type="submit" disabled={loading}
                style={{width:'100%',padding:14,fontSize:14,fontWeight:600,background:loading?'#a8a69e':`linear-gradient(135deg,${c},${c}dd)`,color:'#fff',border:'none',borderRadius:8,cursor:loading?'not-allowed':'pointer',fontFamily:'inherit',boxShadow:`0 4px 14px ${c}40`}}>
                {loading?'Connexion...':'Se connecter'}
              </button>
            </form>
          )}
        </div>

        <div style={{textAlign:'center',marginTop:18,fontSize:11,color:'#a8a69e'}}>
          <strong style={{color:'#6b6860'}}>RSS</strong> · Développé par <strong style={{color:'#6b6860'}}>RS Comptabilité</strong><br/>
          <span style={{fontSize:10}}>Tous droits réservés © 2026</span>
        </div>
      </div>
    </div>
  )
}