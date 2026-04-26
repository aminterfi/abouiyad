'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function HubPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [companies, setCompanies] = useState<any[]>([])
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newCompany, setNewCompany] = useState({ name: '', slug: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (!u) {
      router.push('/')
      return
    }
    const parsed = JSON.parse(u)
    setUser(parsed)
    loadCompanies(parsed.id)
  }, [])

  async function loadCompanies(userId: string) {
    setLoading(true)
    const [{ data: comps }, { data: sub }] = await Promise.all([
      supabase.rpc('get_owner_companies', { p_user_id: userId }),
      supabase.rpc('get_owner_subscription', { p_user_id: userId })
    ])
    setCompanies(comps || [])
    setSubscription(sub?.[0] || null)
    localStorage.setItem('owner_companies', JSON.stringify(comps || []))
    setLoading(false)
  }

  function enterCompany(c: any) {
    // Mettre à jour le user dans localStorage avec la nouvelle entreprise sélectionnée
    const updatedUser = {
      ...user,
      company_id: c.company_id,
      company_name: c.company_name,
      slug: c.slug,
    }
    localStorage.setItem('user', JSON.stringify(updatedUser))
    window.location.href = `/${c.slug}/dashboard`
  }

  async function handleCreate() {
    setError('')
    if (!newCompany.name.trim() || !newCompany.slug.trim()) {
      setError('Nom et slug requis')
      return
    }
    
    const slugClean = newCompany.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-')
    
    setCreating(true)
    try {
      const { data, error } = await supabase.rpc('add_company_to_owner', {
        p_user_id: user.id,
        p_company_name: newCompany.name.trim(),
        p_slug: slugClean,
        p_currency: 'DZD'
      })
      
      if (error) throw error
      
      // Recharger
      await loadCompanies(user.id)
      setShowCreate(false)
      setNewCompany({ name: '', slug: '' })
      
      // Optionnel : entrer directement dans la nouvelle entreprise
      const newComp = (await supabase.rpc('get_owner_companies', { p_user_id: user.id })).data?.find((c: any) => c.company_id === data)
      if (newComp) enterCompany(newComp)
      
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la création')
    }
    setCreating(false)
  }

  function logout() {
    localStorage.removeItem('user')
    localStorage.removeItem('owner_companies')
    localStorage.removeItem('subscription')
    supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8f7f5',color:'#a8a69e',fontFamily:'Outfit,sans-serif'}}>Chargement...</div>
  }

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#f8f7f5,#e8e6e0)',padding:'40px 20px',fontFamily:'Outfit,sans-serif'}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>
        
        {/* HEADER */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:32,flexWrap:'wrap',gap:16}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:50,height:50,borderRadius:14,background:'linear-gradient(135deg,#2563EB,#5B3DF5)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:20,fontWeight:800,boxShadow:'0 8px 20px rgba(91,61,245,0.3)'}}>RSS</div>
            <div>
              <div style={{fontSize:22,fontWeight:800,color:'#1a1916',letterSpacing:'-.5px'}}>Mes entreprises</div>
              <div style={{fontSize:12,color:'#6b6860',marginTop:2}}>Bonjour <strong>{user?.full_name?.split(' ')[0]}</strong></div>
            </div>
          </div>
          <button onClick={logout}
            style={{padding:'9px 16px',fontSize:13,color:'#dc2626',background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.15)',borderRadius:8,cursor:'pointer',fontFamily:'inherit'}}>
            Déconnexion
          </button>
        </div>

        {/* SUBSCRIPTION BANNER */}
        {subscription && (
          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.06)',borderRadius:14,padding:'14px 20px',marginBottom:24,display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}>
            <div>
              <div style={{fontSize:11,color:'#a8a69e',textTransform:'uppercase',fontWeight:600,letterSpacing:'.5px'}}>Votre abonnement</div>
              <div style={{fontSize:14,fontWeight:600,marginTop:2,display:'flex',alignItems:'center',gap:8}}>
                {subscription.plan_name || 'Trial'}
                <span style={{
                  fontSize:11,
                  padding:'2px 8px',
                  borderRadius:20,
                  background: subscription.is_active ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
                  color: subscription.is_active ? '#16a34a' : '#dc2626',
                  fontWeight:600
                }}>
                  {subscription.is_active ? '✓ Actif' : '⚠ Expiré'}
                </span>
              </div>
            </div>
            <div style={{fontSize:11,color:'#6b6860'}}>
              Couvre <strong>{companies.length}</strong> entreprise(s)
            </div>
          </div>
        )}

        {/* ENTREPRISES GRID */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16,marginBottom:24}}>
          {companies.map((c: any) => (
            <div key={c.company_id}
              onClick={() => enterCompany(c)}
              style={{
                background:'#fff',
                border:'1px solid rgba(0,0,0,0.06)',
                borderRadius:14,
                padding:20,
                cursor:'pointer',
                transition:'all .2s',
                boxShadow:'0 1px 3px rgba(0,0,0,0.03)',
                position:'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'
              }}
            >
              {c.is_primary && (
                <span style={{position:'absolute',top:12,right:12,fontSize:10,background:'rgba(37,99,235,0.1)',color:'#2563EB',padding:'3px 9px',borderRadius:20,fontWeight:600}}>
                  ★ Principale
                </span>
              )}
              {c.is_platform_admin && (
                <span style={{position:'absolute',top:12,right:12,fontSize:10,background:'linear-gradient(135deg,#7c3aed,#5B3DF5)',color:'#fff',padding:'3px 9px',borderRadius:20,fontWeight:600}}>
                  👑 Admin RS
                </span>
              )}
              
              <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
                {c.logo_url ? (
                  <img src={c.logo_url} alt={c.company_name} style={{width:48,height:48,borderRadius:12,objectFit:'cover'}}/>
                ) : (
                  <div style={{width:48,height:48,borderRadius:12,background:c.primary_color || '#2563EB',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:18}}>
                    {c.company_name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:15,fontWeight:700,color:'#1a1916',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.company_name}</div>
                  <div style={{fontSize:11,color:'#a8a69e',fontFamily:'JetBrains Mono,monospace',marginTop:2}}>/{c.slug}</div>
                </div>
              </div>
              
              <div style={{fontSize:11,color:'#a8a69e',display:'flex',alignItems:'center',gap:6,paddingTop:12,borderTop:'1px solid rgba(0,0,0,0.05)'}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                Entrer dans l'entreprise
              </div>
            </div>
          ))}

          {/* Bouton créer */}
          <div onClick={() => setShowCreate(true)}
            style={{
              background:'rgba(37,99,235,0.04)',
              border:'2px dashed rgba(37,99,235,0.3)',
              borderRadius:14,
              padding:20,
              cursor:'pointer',
              display:'flex',
              flexDirection:'column',
              alignItems:'center',
              justifyContent:'center',
              minHeight:160,
              transition:'all .2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(37,99,235,0.08)'
              e.currentTarget.style.borderColor = 'rgba(37,99,235,0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(37,99,235,0.04)'
              e.currentTarget.style.borderColor = 'rgba(37,99,235,0.3)'
            }}
          >
            <div style={{width:48,height:48,borderRadius:'50%',background:'#2563EB',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:700,marginBottom:10}}>+</div>
            <div style={{fontSize:14,fontWeight:600,color:'#2563EB'}}>Nouvelle entreprise</div>
            <div style={{fontSize:11,color:'#a8a69e',marginTop:4,textAlign:'center'}}>Ajouter une autre entreprise<br/>à votre compte</div>
          </div>
        </div>

        <div style={{textAlign:'center',marginTop:32,fontSize:11,color:'#a8a69e'}}>
          <strong style={{color:'#6b6860'}}>RSS</strong> · Développé par <strong style={{color:'#6b6860'}}>RS Comptabilité</strong>
        </div>
      </div>

      {/* MODAL CRÉATION */}
      {showCreate && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20}}
          onClick={() => setShowCreate(false)}>
          <div style={{background:'#fff',borderRadius:16,padding:30,maxWidth:440,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}
            onClick={(e) => e.stopPropagation()}>
            <div style={{fontSize:18,fontWeight:700,marginBottom:6}}>Créer une nouvelle entreprise</div>
            <div style={{fontSize:12,color:'#a8a69e',marginBottom:20}}>Cette entreprise sera ajoutée à votre compte sans abonnement supplémentaire</div>
            
            {error && <div style={{background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#dc2626',marginBottom:14}}>{error}</div>}
            
            <label style={{fontSize:12,color:'#6b6860',marginBottom:6,display:'block',fontWeight:500}}>Nom de l'entreprise</label>
            <input value={newCompany.name} onChange={e => setNewCompany({...newCompany, name: e.target.value})}
              placeholder="Ex: Mon Restaurant"
              style={{width:'100%',padding:'11px 14px',fontSize:14,border:'1px solid rgba(0,0,0,0.14)',borderRadius:8,background:'#f8f7f5',marginBottom:14,outline:'none',fontFamily:'inherit'}}/>
            
            <label style={{fontSize:12,color:'#6b6860',marginBottom:6,display:'block',fontWeight:500}}>URL (slug)</label>
            <div style={{display:'flex',alignItems:'center',background:'#f8f7f5',border:'1px solid rgba(0,0,0,0.14)',borderRadius:8,padding:'0 0 0 14px',marginBottom:20}}>
              <span style={{fontSize:13,color:'#a8a69e',fontFamily:'JetBrains Mono,monospace'}}>rss.rscomptabilite.com/</span>
              <input value={newCompany.slug} onChange={e => setNewCompany({...newCompany, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})}
                placeholder="mon-restaurant"
                style={{flex:1,padding:'11px 14px',fontSize:14,border:'none',background:'transparent',outline:'none',fontFamily:'JetBrains Mono,monospace'}}/>
            </div>
            
            <div style={{display:'flex',gap:8}}>
              <button onClick={() => setShowCreate(false)} disabled={creating}
                style={{flex:1,padding:12,fontSize:13,fontWeight:500,background:'transparent',color:'#6b6860',border:'1px solid rgba(0,0,0,0.14)',borderRadius:8,cursor:'pointer',fontFamily:'inherit'}}>
                Annuler
              </button>
              <button onClick={handleCreate} disabled={creating || !newCompany.name || !newCompany.slug}
                style={{flex:2,padding:12,fontSize:13,fontWeight:600,background:creating?'#a8a69e':'#2563EB',color:'#fff',border:'none',borderRadius:8,cursor:creating?'not-allowed':'pointer',fontFamily:'inherit'}}>
                {creating ? 'Création...' : 'Créer l\'entreprise'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}