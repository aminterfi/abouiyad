'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) {
      const parsed = JSON.parse(u)
      // Si plusieurs entreprises → hub
      if (parsed.nb_companies && parsed.nb_companies > 1) {
        window.location.href = '/hub'
        return
      }
      // Sinon → dashboard de l'entreprise
      if (parsed.slug) {
        window.location.href = `/${parsed.slug}/dashboard`
        return
      }
    }
    setChecking(false)
  }, [])

  async function loginOwner(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: ownerEmail.trim(), password: ownerPassword,
      })
      if (authErr) throw authErr

      // Récupérer toutes les entreprises de l'owner
      const { data: companies, error: compErr } = await supabase.rpc('get_owner_companies', { 
        p_user_id: auth.user!.id 
      })
      if (compErr) throw compErr
      if (!companies || companies.length === 0) {
        throw new Error('Aucune entreprise liée à ce compte')
      }

      // Récupérer l'abonnement de l'owner
      const { data: subData } = await supabase.rpc('get_owner_subscription', { 
        p_user_id: auth.user!.id 
      })
      const sub = subData?.[0]

      // Vérifier abonnement actif (sauf platform admin)
      const isPlatformAdmin = companies.some((c: any) => c.is_platform_admin)
      if (!isPlatformAdmin && sub && !sub.is_active) {
        await supabase.auth.signOut()
        throw new Error('Abonnement suspendu ou expiré. Contactez RS Comptabilité.')
      }

      // Choisir l'entreprise primary par défaut
      const primary = companies.find((c: any) => c.is_primary) || companies[0]

      const userData = {
        id: auth.user!.id,
        email: auth.user!.email,
        full_name: primary.company_name ? companies[0].company_name : auth.user!.email,
        role: 'owner',
        company_id: primary.company_id,
        company_name: primary.company_name,
        is_platform_admin: isPlatformAdmin,
        type: 'owner',
        slug: primary.slug,
        nb_companies: companies.length,
      }

      // Récupérer le full_name depuis owners
      const { data: ownerInfo } = await supabase.rpc('get_owner_info', { p_user_id: auth.user!.id })
      if (ownerInfo?.[0]) {
        userData.full_name = ownerInfo[0].full_name
      }

      localStorage.setItem('user', JSON.stringify(userData))
      localStorage.setItem('owner_companies', JSON.stringify(companies))
      if (sub) localStorage.setItem('subscription', JSON.stringify(sub))

      // Redirection
      if (companies.length > 1) {
        window.location.href = '/hub'
      } else {
        window.location.href = `/${primary.slug}/dashboard`
      }
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect' : err.message)
      setLoading(false)
    }
  }

  if (checking) {
    return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8f7f5',color:'#a8a69e',fontFamily:'Outfit,sans-serif'}}>Chargement...</div>
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'linear-gradient(135deg,#f8f7f5,#e8e6e0)',fontFamily:'Outfit,sans-serif'}}>
      <div style={{width:'100%',maxWidth:440}}>
        <div style={{textAlign:'center',marginBottom:30}}>
          <div style={{width:64,height:64,borderRadius:16,background:'linear-gradient(135deg,#2563EB,#5B3DF5)',display:'inline-flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:22,fontWeight:800,boxShadow:'0 10px 30px rgba(91,61,245,0.35)',marginBottom:16,letterSpacing:'-1px'}}>RSS</div>
          <div style={{fontSize:30,fontWeight:800,letterSpacing:'-.5px'}}>RSS</div>
          <div style={{fontSize:13,color:'#6b6860',marginTop:4}}>Système de gestion comptable</div>
        </div>
        <div style={{background:'#fff',borderRadius:16,padding:30,boxShadow:'0 10px 40px rgba(0,0,0,0.08)',border:'1px solid rgba(0,0,0,0.06)'}}>
          <div style={{marginBottom:24}}>
            <div style={{fontSize:20,fontWeight:700,marginBottom:4}}>Connexion entreprise</div>
            <div style={{fontSize:12,color:'#a8a69e'}}>Connectez-vous avec votre email professionnel</div>
          </div>
          {error && <div style={{background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#dc2626',marginBottom:16}}>{error}</div>}
          <form onSubmit={loginOwner}>
            <label style={{fontSize:12,color:'#6b6860',marginBottom:6,display:'block'}}>Email professionnel</label>
            <input type="email" required autoFocus value={ownerEmail} onChange={e=>setOwnerEmail(e.target.value)} placeholder="contact@votre-entreprise.com"
              style={{width:'100%',padding:'11px 14px',fontSize:14,border:'1px solid rgba(0,0,0,0.14)',borderRadius:8,background:'#f8f7f5',marginBottom:14,outline:'none',fontFamily:'inherit'}}/>
            <label style={{fontSize:12,color:'#6b6860',marginBottom:6,display:'block'}}>Mot de passe</label>
            <input type="password" required value={ownerPassword} onChange={e=>setOwnerPassword(e.target.value)} placeholder="••••••••"
              style={{width:'100%',padding:'11px 14px',fontSize:14,border:'1px solid rgba(0,0,0,0.14)',borderRadius:8,background:'#f8f7f5',marginBottom:20,outline:'none',fontFamily:'inherit'}}/>
            <button type="submit" disabled={loading}
              style={{width:'100%',padding:14,fontSize:14,fontWeight:600,background:loading?'#a8a69e':'linear-gradient(135deg,#2563EB,#1d4ed8)',color:'#fff',border:'none',borderRadius:8,cursor:loading?'not-allowed':'pointer',fontFamily:'inherit',boxShadow:'0 4px 14px rgba(37,99,235,0.3)'}}>
              {loading?'Connexion...':'Se connecter'}
            </button>
            <div style={{textAlign:'center',marginTop:20,fontSize:12,color:'#6b6860'}}>
              Pas encore de compte ? <Link href="/signup" style={{color:'#2563EB',fontWeight:600,textDecoration:'none'}}>Créer une entreprise</Link>
            </div>
          </form>
          <div style={{marginTop:20,paddingTop:20,borderTop:'1px solid rgba(0,0,0,0.06)',fontSize:11,color:'#a8a69e',textAlign:'center'}}>
            👤 Employé ? Demandez votre lien d'accès à votre administrateur
          </div>
        </div>
        <div style={{textAlign:'center',marginTop:20,fontSize:11,color:'#a8a69e'}}>
          <strong style={{color:'#6b6860'}}>RSS</strong> · Développé par <strong style={{color:'#6b6860'}}>RS Comptabilité</strong><br/>
          <span style={{fontSize:10}}>Tous droits réservés © 2026</span>
        </div>
      </div>
    </div>
  )
}