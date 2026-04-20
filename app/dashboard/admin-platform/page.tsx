'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

function dzd(v: number) { return (v||0).toLocaleString('fr-DZ',{minimumFractionDigits:0})+' DZD' }

export default function AdminPlatformPage() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<any>({})
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('tous')
  const [selectedCompany, setSelectedCompany] = useState<any>(null)
  const [showActivateModal, setShowActivateModal] = useState(false)
  const [activateForm, setActivateForm] = useState({ plan: 'pro', months: 12, price: 0 })
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAccess()
  }, [])

  async function checkAccess() {
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    const parsed = JSON.parse(u)
    
    // Vérifier is_platform_admin
    if (parsed.type !== 'owner') {
      router.push('/dashboard')
      return
    }
    
    const { data: owner } = await supabase
      .from('owners')
      .select('is_platform_admin')
      .eq('id', parsed.id)
      .single()
    
    if (!owner?.is_platform_admin) {
      alert('Accès refusé — Cette section est réservée à RS Comptabilité')
      router.push('/dashboard')
      return
    }
    
    setUser(parsed)
    fetchAll()
  }

  async function fetchAll() {
    setLoading(true)
    const [{ data: statsData }, { data: compData }] = await Promise.all([
      supabase.rpc('get_platform_stats'),
      supabase.rpc('get_all_companies_admin')
    ])
    setStats(statsData || {})
    setCompanies(compData || [])
    setLoading(false)
  }

  async function activateSubscription() {
    if (!selectedCompany) return
    setSaving(true)
    await supabase.rpc('admin_activate_subscription', {
      p_company_id: selectedCompany.id,
      p_plan: activateForm.plan,
      p_duration_months: activateForm.months,
      p_price: activateForm.price,
    })
    setShowActivateModal(false)
    setSelectedCompany(null)
    fetchAll()
    setSaving(false)
  }

  async function extendTrial(companyId: string) {
    const days = prompt('Prolonger de combien de jours ?', '7')
    if (!days) return
    await supabase.rpc('admin_extend_trial', {
      p_company_id: companyId,
      p_days: parseInt(days),
    })
    fetchAll()
  }

  async function suspendCompany(companyId: string, name: string) {
    if (!confirm(`Suspendre l'abonnement de "${name}" ?\n\nL'entreprise ne pourra plus accéder à son dashboard.`)) return
    await supabase.rpc('admin_suspend_subscription', { p_company_id: companyId })
    fetchAll()
  }

  async function deleteCompany(companyId: string, name: string) {
    if (!confirm(`⚠️ SUPPRIMER DÉFINITIVEMENT "${name}" ?\n\nToutes les données (factures, clients, paiements) seront perdues.\nCette action est IRRÉVERSIBLE.`)) return
    if (!confirm(`Vraiment sûr ? Tapez OK pour confirmer.`)) return
    await supabase.from('companies').delete().eq('id', companyId)
    fetchAll()
  }

  if (loading) return <div style={{textAlign:'center',padding:60,color:'#a8a69e'}}>Chargement...</div>

  const filtered = companies.filter(c => {
    const matchSearch = !search || 
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.owner_email?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'tous' || c.sub_status === filter
    return matchSearch && matchFilter
  })

  const statusBadge = (status: string, trial_end: string) => {
    if (status === 'trial') {
      const days = Math.ceil((new Date(trial_end).getTime() - Date.now()) / 86400000)
      return <span style={{background:'rgba(91,61,245,0.1)',color:'#5B3DF5',fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:20}}>🎁 Essai · {days}j restants</span>
    }
    if (status === 'active') return <span style={{background:'rgba(22,163,74,0.1)',color:'#15803d',fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:20}}>✓ Actif</span>
    if (status === 'expired') return <span style={{background:'rgba(220,38,38,0.08)',color:'#dc2626',fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:20}}>✗ Expiré</span>
    return <span style={{background:'#f0eeea',color:'#6b6860',fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:20}}>Suspendu</span>
  }

  const planBadge = (plan: string) => {
    const colors: any = { trial:'#5B3DF5', basic:'#6b6860', pro:'#2563EB', premium:'#d97706' }
    const labels: any = { trial:'Trial', basic:'Basic', pro:'Pro', premium:'Premium' }
    return <span style={{background:`${colors[plan]||'#6b6860'}15`,color:colors[plan]||'#6b6860',fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:4,border:`1px solid ${colors[plan]||'#6b6860'}30`}}>{labels[plan]||plan}</span>
  }

  return (
    <div>
      {/* HEADER */}
      <div style={{marginBottom:22}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
          <div style={{fontSize:20,fontWeight:800,letterSpacing:'-.3px'}}>🛡️ Administration RS Comptabilité</div>
          <span style={{background:'linear-gradient(135deg,#5B3DF5,#2563EB)',color:'#fff',fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:4,textTransform:'uppercase',letterSpacing:'.5px'}}>Super Admin</span>
        </div>
        <div style={{fontSize:13,color:'#a8a69e'}}>Panel de gestion de la plateforme SaaS — Toutes les entreprises clientes</div>
      </div>

      {/* STATS */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:22}}>
        {[
          { label:'Total entreprises', val:stats.total_companies||0, color:'#2563EB', icon:'🏢' },
          { label:'En essai', val:stats.trial_companies||0, color:'#5B3DF5', icon:'🎁' },
          { label:'Actifs payants', val:stats.paying_companies||0, color:'#16a34a', icon:'💰' },
          { label:'Expirés', val:stats.expired_companies||0, color:'#dc2626', icon:'✗' },
        ].map((s,i) => (
          <div key={i} style={{background:'#fff',border:'1px solid rgba(0,0,0,0.05)',borderRadius:12,padding:'16px 18px',borderLeft:`3px solid ${s.color}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
              <div style={{fontSize:11,color:'#a8a69e',fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px'}}>{s.label}</div>
              <div style={{fontSize:20}}>{s.icon}</div>
            </div>
            <div style={{fontSize:26,fontWeight:700,color:s.color}}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* SECONDARY STATS */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:22}}>
        {[
          { label:'Propriétaires', val:stats.total_owners||0 },
          { label:'Utilisateurs total', val:stats.total_users||0 },
          { label:'Factures émises', val:stats.total_bills||0 },
          { label:'MRR', val:dzd(stats.total_revenue_app||0), color:'#16a34a' },
        ].map((s:any,i) => (
          <div key={i} style={{background:'rgba(255,255,255,0.6)',border:'1px solid rgba(0,0,0,0.05)',borderRadius:10,padding:'12px 16px'}}>
            <div style={{fontSize:10,color:'#a8a69e',fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px',marginBottom:4}}>{s.label}</div>
            <div style={{fontSize:16,fontWeight:700,color:s.color||'#1a1916',fontFamily:'JetBrains Mono,monospace'}}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* SEARCH + FILTERS */}
      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:7,background:'#fff',border:'1px solid rgba(0,0,0,0.14)',borderRadius:6,padding:'8px 12px',flex:1,minWidth:200,maxWidth:320}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a8a69e" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input style={{background:'none',border:'none',outline:'none',color:'#1a1916',fontSize:13,fontFamily:'inherit',width:'100%'}} placeholder="Rechercher entreprise..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        {[
          {v:'tous',l:'Toutes'},
          {v:'trial',l:'Essai'},
          {v:'active',l:'Actifs'},
          {v:'expired',l:'Expirés'},
          {v:'cancelled',l:'Suspendus'},
        ].map(f => (
          <button key={f.v} onClick={()=>setFilter(f.v)}
            style={{padding:'8px 14px',fontSize:12,borderRadius:6,cursor:'pointer',border:'1px solid rgba(0,0,0,0.14)',background:filter===f.v?'#2563EB':'#fff',color:filter===f.v?'#fff':'#6b6860',fontFamily:'inherit',fontWeight:500}}>
            {f.l}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
            <thead>
              <tr>{['Entreprise','Propriétaire','Plan','Statut','Users','Factures','CA','Inscrit le','Actions'].map(h => (
                <th key={h} style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px',padding:'11px 14px',borderBottom:'1px solid rgba(0,0,0,0.08)',textAlign:'left',whiteSpace:'nowrap',background:'#f8f7f5'}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'#a8a69e'}}>Aucune entreprise trouvée</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} style={{borderBottom:'1px solid rgba(0,0,0,0.04)'}}>
                  <td style={{padding:'12px 14px'}}>
                    <div style={{fontSize:13,fontWeight:600}}>{c.name}</div>
                    <div style={{fontSize:11,color:'#a8a69e',marginTop:2}}>{c.email || '—'}</div>
                  </td>
                  <td style={{padding:'12px 14px'}}>
                    <div style={{fontSize:13,fontWeight:500}}>{c.owner_name || '—'}</div>
                    <div style={{fontSize:11,color:'#a8a69e',marginTop:2}}>{c.owner_email}</div>
                  </td>
                  <td style={{padding:'12px 14px'}}>{planBadge(c.sub_plan)}</td>
                  <td style={{padding:'12px 14px'}}>{statusBadge(c.sub_status, c.sub_trial_end)}</td>
                  <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:600}}>{c.users_count}</td>
                  <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12}}>{c.bills_count}</td>
                  <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:600,color:'#16a34a'}}>{dzd(c.total_revenue)}</td>
                  <td style={{padding:'12px 14px',fontSize:12,color:'#6b6860',whiteSpace:'nowrap'}}>{new Date(c.created_at).toLocaleDateString('fr-DZ')}</td>
                  <td style={{padding:'12px 14px'}}>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                      <button onClick={()=>{setSelectedCompany(c);setShowActivateModal(true)}}
                        style={{padding:'5px 10px',fontSize:11,borderRadius:5,cursor:'pointer',background:'rgba(22,163,74,0.08)',color:'#16a34a',border:'1px solid rgba(22,163,74,0.15)',fontFamily:'inherit',fontWeight:500}}>
                        ✓ Activer
                      </button>
                      <button onClick={()=>extendTrial(c.id)}
                        style={{padding:'5px 10px',fontSize:11,borderRadius:5,cursor:'pointer',background:'rgba(91,61,245,0.08)',color:'#5B3DF5',border:'1px solid rgba(91,61,245,0.15)',fontFamily:'inherit',fontWeight:500}}>
                        + Essai
                      </button>
                      <button onClick={()=>suspendCompany(c.id,c.name)}
                        style={{padding:'5px 10px',fontSize:11,borderRadius:5,cursor:'pointer',background:'rgba(217,119,6,0.08)',color:'#d97706',border:'1px solid rgba(217,119,6,0.15)',fontFamily:'inherit',fontWeight:500}}>
                        Susp.
                      </button>
                      <button onClick={()=>deleteCompany(c.id,c.name)}
                        style={{padding:'5px 10px',fontSize:11,borderRadius:5,cursor:'pointer',background:'rgba(220,38,38,0.08)',color:'#dc2626',border:'1px solid rgba(220,38,38,0.15)',fontFamily:'inherit',fontWeight:500}}>
                        Supp.
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{textAlign:'center',marginTop:20,fontSize:11,color:'#c8c6be'}}>
        Panel réservé à RS Comptabilité · {filtered.length} entreprise(s) affichée(s)
      </div>

      {/* MODAL ACTIVATE */}
      {showActivateModal && selectedCompany && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}
          onClick={()=>setShowActivateModal(false)}>
          <div style={{background:'#fff',borderRadius:14,padding:28,maxWidth:480,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:18,fontWeight:700,marginBottom:4}}>Activer l'abonnement</div>
            <div style={{fontSize:12,color:'#a8a69e',marginBottom:20}}>
              Entreprise : <strong style={{color:'#1a1916'}}>{selectedCompany.name}</strong>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,fontWeight:500,color:'#6b6860',marginBottom:6,display:'block'}}>Plan</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {['basic','pro','premium'].map(p => (
                  <button key={p} onClick={()=>setActivateForm({...activateForm,plan:p})}
                    style={{padding:'12px',borderRadius:8,border:`2px solid ${activateForm.plan===p?'#2563EB':'rgba(0,0,0,0.1)'}`,background:activateForm.plan===p?'rgba(37,99,235,0.05)':'#fff',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:600,textTransform:'capitalize',color:activateForm.plan===p?'#2563EB':'#1a1916'}}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
              <div>
                <label style={{fontSize:12,fontWeight:500,color:'#6b6860',marginBottom:6,display:'block'}}>Durée (mois)</label>
                <input type="number" min="1" value={activateForm.months} onChange={e=>setActivateForm({...activateForm,months:parseInt(e.target.value)||1})}
                  style={{width:'100%',padding:'10px 12px',fontSize:14,border:'1px solid rgba(0,0,0,0.14)',borderRadius:6,background:'#f8f7f5',fontFamily:'inherit'}}/>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:500,color:'#6b6860',marginBottom:6,display:'block'}}>Prix/mois (DZD)</label>
                <input type="number" value={activateForm.price} onChange={e=>setActivateForm({...activateForm,price:parseFloat(e.target.value)||0})}
                  style={{width:'100%',padding:'10px 12px',fontSize:14,border:'1px solid rgba(0,0,0,0.14)',borderRadius:6,background:'#f8f7f5',fontFamily:'inherit'}}/>
              </div>
            </div>

            <div style={{padding:'12px 14px',background:'rgba(22,163,74,0.05)',border:'1px solid rgba(22,163,74,0.15)',borderRadius:8,fontSize:12,color:'#15803d',marginBottom:20}}>
              <strong>Résumé :</strong> Abonnement <strong>{activateForm.plan}</strong> pendant <strong>{activateForm.months} mois</strong> à <strong>{dzd(activateForm.price)}</strong>/mois
              <div style={{marginTop:4}}>Total : <strong>{dzd(activateForm.price * activateForm.months)}</strong></div>
            </div>

            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowActivateModal(false)}
                style={{padding:'10px 18px',fontSize:13,borderRadius:6,cursor:'pointer',background:'transparent',color:'#6b6860',border:'1px solid rgba(0,0,0,0.14)',fontFamily:'inherit'}}>Annuler</button>
              <button onClick={activateSubscription} disabled={saving}
                style={{padding:'10px 18px',fontSize:13,borderRadius:6,cursor:'pointer',background:'#16a34a',color:'#fff',border:'none',fontFamily:'inherit',fontWeight:600}}>
                {saving?'...':'✓ Activer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}