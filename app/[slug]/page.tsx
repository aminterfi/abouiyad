'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function SlugHomePage() {
  const { slug } = useParams() as { slug: string }
  const router = useRouter()
  const [company, setCompany] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loadingPage, setLoadingPage] = useState(true)

  const [mode, setMode] = useState<'employee' | 'owner'>('employee')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    async function init() {
      const { data } = await supabase.rpc('get_company_by_slug', { p_slug: slug })
      if (!data) { router.push('/'); return }
      setCompany(data)

      const u = localStorage.getItem('user')
      if (u) {
        const parsed = JSON.parse(u)
        if (parsed.company_id === data.id || parsed.is_platform_admin) {
          setUser(parsed)
        }
      }
      setLoadingPage(false)
    }
    init()
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
      const userData = {
        id: auth.user!.id, email: auth.user!.email, full_name: owner.full_name,
        role: 'owner', company_id: owner.company_id, company_name: owner.company_name,
        is_platform_admin: owner.is_platform_admin, type: 'owner', slug,
      }
      localStorage.setItem('user', JSON.stringify(userData))
      if (sub) localStorage.setItem('subscription', JSON.stringify(sub))
      window.location.href = `/${slug}/dashboard`
      return
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
      const userData = { ...data, type: 'employee', slug }
      localStorage.setItem('user', JSON.stringify(userData))
      window.location.href = `/${slug}/dashboard`
      return
    } catch (err: any) { setError(err.message) }
    setLoading(false)
  }

  function logout() {
    localStorage.removeItem('user')
    localStorage.removeItem('subscription')
    supabase.auth.signOut()
    setUser(null)
  }

  if (loadingPage) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8f7f5',color:'#a8a69e'}}>Chargement...</div>

  const c = company?.primary_color || '#2563EB'

  // ===== HUB (après login) =====
  if (user) {
    const isOwner = user.type === 'owner' || user.role === 'owner' || user.role === 'superadmin' || user.role === 'admin'
    const isAdmin = isOwner || user.role === 'admin'

    const MODULES = [
      { label:'Tableau de bord', href:`/${slug}/dashboard`, icon:'📊', color:'#2563EB', roles:['all'] },
      { label:'Factures', href:`/${slug}/dashboard/factures`, icon:'📄', color:'#16a34a', roles:['all'] },
      { label:'Clients', href:`/${slug}/dashboard/clients`, icon:'👥', color:'#7c3aed', roles:['all'] },
      { label:'Paiements', href:`/${slug}/dashboard/paiements`, icon:'💰', color:'#d97706', roles:['all'] },
      { label:'Produits', href:`/${slug}/dashboard/produits`, icon:'📦', color:'#0d9488', roles:['all'] },
      { label:'Utilisateurs', href:`/${slug}/dashboard/utilisateurs`, icon:'👤', color:'#dc2626', roles:['admin','owner'] },
      { label:'Paramètres', href:`/${slug}/dashboard/parametres`, icon:'⚙️', color:'#6b6860', roles:['admin','owner'] },
      { label:'Mon profil', href:`/${slug}/dashboard/profil`, icon:'🙋', color:'#5B3DF5', roles:['all'] },
    ]

    const visibleModules = MODULES.filter(m => 
      m.roles.includes('all') || 
      (m.roles.includes('admin') && isAdmin) ||
      (m.roles.includes('owner') && isOwner)
    )

    return (
      <div style={{minHeight:'100vh',background:`linear-gradient(135deg,${c}05,${c}12)`,fontFamily:'Outfit,sans-serif'}}>
        {/* HEADER */}
        <div style={{background:'#fff',borderBottom:'1px solid rgba(0,0,0,0.06)',padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} style={{width:36,height:36,borderRadius:8,objectFit:'contain',background:'#f8f7f5',padding:4}}/>
            ) : (
              <div style={{width:36,height:36,borderRadius:8,background:`linear-gradient(135deg,${c},${c}dd)`,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:15}}>{company.name.charAt(0).toUpperCase()}</div>
            )}
            <div>
              <div style={{fontSize:14,fontWeight:700}}>{company.name}</div>
              <div style={{fontSize:10,color:'#a8a69e'}}>rss.rscomptabilite.com/{slug}</div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:12,fontWeight:600}}>{user.full_name}</div>
              <div style={{fontSize:10,color:'#a8a69e'}}>{user.role}</div>
            </div>
            <div style={{width:36,height:36,borderRadius:'50%',background:`linear-gradient(135deg,${c},${c}dd)`,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:13}}>
              {user.full_name?.split(' ').map((w:string)=>w[0]).slice(0,2).join('')||'U'}
            </div>
            <button onClick={logout} style={{padding:'7px 14px',background:'rgba(220,38,38,0.08)',color:'#dc2626',border:'1px solid rgba(220,38,38,0.2)',borderRadius:6,cursor:'pointer',fontSize:12,fontFamily:'inherit',fontWeight:500}}>Déconnexion</button>
          </div>
        </div>

        {/* WELCOME */}
        <div style={{maxWidth:1100,margin:'0 auto',padding:'40px 24px 24px'}}>
          <div style={{textAlign:'center',marginBottom:40}}>
            <div style={{fontSize:28,fontWeight:800,letterSpacing:'-.5px',marginBottom:6}}>Bonjour {user.full_name?.split(' ')[0]} 👋</div>
            <div style={{fontSize:14,color:'#6b6860'}}>Que souhaitez-vous faire aujourd'hui ?</div>
          </div>

          {/* MODULES GRID */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))',gap:16}}>
            {visibleModules.map(m => (
              <Link key={m.href} href={m.href} style={{textDecoration:'none'}}>
                <div style={{background:'#fff',borderRadius:16,padding:'28px 20px',textAlign:'center',cursor:'pointer',border:'1px solid rgba(0,0,0,0.06)',boxShadow:'0 2px 12px rgba(0,0,0,0.04)',transition:'all .2s'}}
                  onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.08)'}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.04)'}}>
                  <div style={{width:64,height:64,borderRadius:16,background:`${m.color}15`,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:30,marginBottom:14}}>{m.icon}</div>
                  <div style={{fontSize:14,fontWeight:600,color:'#1a1916'}}>{m.label}</div>
                </div>
              </Link>
            ))}

            {user.is_platform_admin && (
              <Link href={`/${slug}/dashboard/admin-platform`} style={{textDecoration:'none'}}>
                <div style={{background:'linear-gradient(135deg,#7c3aed,#5B3DF5)',borderRadius:16,padding:'28px 20px',textAlign:'center',cursor:'pointer',boxShadow:'0 8px 24px rgba(124,58,237,0.3)'}}>
                  <div style={{width:64,height:64,borderRadius:16,background:'rgba(255,255,255,0.2)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:30,marginBottom:14}}>👑</div>
                  <div style={{fontSize:14,fontWeight:700,color:'#fff'}}>Admin RS</div>
                </div>
              </Link>
            )}
          </div>

          <div style={{textAlign:'center',marginTop:40,fontSize:11,color:'#a8a69e'}}>
            <strong style={{color:'#6b6860'}}>RSS</strong> · Développé par <strong style={{color:'#6b6860'}}>RS Comptabilité</strong> · © 2026
          </div>
        </div>
      </div>
    )
  }

  // ===== LOGIN =====
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