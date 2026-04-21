'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

function dzd(v: number) { return (v||0).toLocaleString('fr-DZ',{minimumFractionDigits:0})+' DZD' }

const inp: React.CSSProperties = { width:'100%', padding:'10px 12px', fontSize:14, border:'1px solid rgba(0,0,0,0.14)', borderRadius:6, background:'#f8f7f5', color:'#1a1916', fontFamily:'inherit', outline:'none' }
const lbl: React.CSSProperties = { fontSize:12, fontWeight:500, color:'#6b6860', marginBottom:5, display:'block' }

export default function AdminPlatformPage() {
  const [user, setUser] = useState<any>(null)
  const [tab, setTab] = useState<'overview'|'companies'|'subscriptions'|'plans'>('overview')
  const [stats, setStats] = useState<any>({})
  const [companies, setCompanies] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('tous')
  const router = useRouter()

  // Modals
  const [showCreateCompany, setShowCreateCompany] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<any>(null)

  // Form create company
  const [createForm, setCreateForm] = useState({
    company_name:'', owner_email:'', owner_full_name:'', owner_phone:'',
    plan:'trial', duration_months:12, price_monthly:0, start_active:false
  })

  // Form payment
  const [paymentForm, setPaymentForm] = useState({
    amount:0, method:'Virement bancaire', reference:'', months:12,
    new_plan:'', notes:''
  })

  // Details
  const [companyPayments, setCompanyPayments] = useState<any[]>([])
  const [companyHistory, setCompanyHistory] = useState<any[]>([])

  useEffect(() => { checkAccess() }, [])

  async function checkAccess() {
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    const parsed = JSON.parse(u)
    if (parsed.type !== 'owner') { router.push('/dashboard'); return }
    
    const { data: owner } = await supabase.from('owners').select('is_platform_admin').eq('id', parsed.id).single()
    if (!owner?.is_platform_admin) { alert('Accès refusé'); router.push('/dashboard'); return }
    
    setUser(parsed)
    fetchAll()
  }

  async function fetchAll() {
    setLoading(true)
    const [{ data: statsData }, { data: compData }, { data: plansData }] = await Promise.all([
      supabase.rpc('get_platform_stats'),
      supabase.rpc('get_all_companies_admin'),
      supabase.from('plans').select('*').order('display_order')
    ])
    setStats(statsData || {})
    setCompanies(compData || [])
    setPlans(plansData || [])
    setLoading(false)
  }

  async function openDetails(c: any) {
    setSelectedCompany(c)
    const [{ data: pays }, { data: hist }] = await Promise.all([
      supabase.rpc('get_company_payments', { p_company_id: c.id }),
      supabase.rpc('get_company_history', { p_company_id: c.id })
    ])
    setCompanyPayments(pays || [])
    setCompanyHistory(hist || [])
    setShowDetails(true)
  }

  async function createCompany() {
    if (!createForm.company_name || !createForm.owner_email || !createForm.owner_full_name) {
      alert('Remplissez les champs obligatoires'); return
    }
    const { data, error } = await supabase.rpc('admin_create_company', {
      p_company_name: createForm.company_name,
      p_owner_email: createForm.owner_email,
      p_owner_full_name: createForm.owner_full_name,
      p_owner_phone: createForm.owner_phone || null,
      p_plan: createForm.plan,
      p_duration_months: createForm.duration_months,
      p_price_monthly: createForm.price_monthly,
      p_start_active: createForm.start_active
    })
    if (error) { alert('Erreur: ' + error.message); return }
    alert('Entreprise créée !\n\nLe propriétaire doit créer son compte via /signup avec l\'email: ' + createForm.owner_email)
    setShowCreateCompany(false)
    setCreateForm({ company_name:'', owner_email:'', owner_full_name:'', owner_phone:'', plan:'trial', duration_months:12, price_monthly:0, start_active:false })
    fetchAll()
  }

  async function recordPayment() {
    if (!selectedCompany) return
    if (paymentForm.amount <= 0 || paymentForm.months <= 0) {
      alert('Montant et durée requis'); return
    }
    const { data, error } = await supabase.rpc('admin_record_payment', {
      p_company_id: selectedCompany.id,
      p_amount: paymentForm.amount,
      p_method: paymentForm.method,
      p_reference: paymentForm.reference,
      p_months: paymentForm.months,
      p_new_plan: paymentForm.new_plan || null,
      p_notes: paymentForm.notes || null
    })
    if (error) { alert('Erreur: ' + error.message); return }
    alert('✓ Paiement enregistré et abonnement activé jusqu\'au ' + new Date(data.new_end_date).toLocaleDateString('fr-DZ'))
    setShowPayment(false)
    setPaymentForm({ amount:0, method:'Virement bancaire', reference:'', months:12, new_plan:'', notes:'' })
    fetchAll()
  }

  async function extendTrial(companyId: string) {
    const days = prompt('Prolonger de combien de jours ?', '7')
    if (!days) return
    await supabase.rpc('admin_extend_trial', { p_company_id: companyId, p_days: parseInt(days) })
    fetchAll()
  }

  async function suspendCompany(companyId: string, name: string) {
    if (!confirm(`Suspendre l'abonnement de "${name}" ?`)) return
    await supabase.rpc('admin_suspend_subscription', { p_company_id: companyId })
    fetchAll()
  }

  async function deleteCompany(companyId: string, name: string) {
    if (!confirm(`⚠️ SUPPRIMER DÉFINITIVEMENT "${name}" ?\n\nToutes les données seront perdues.`)) return
    if (!confirm(`Vraiment sûr ?`)) return
    await supabase.from('companies').delete().eq('id', companyId)
    fetchAll()
  }

  async function updatePlan(planId: string, field: string, value: any) {
    await supabase.from('plans').update({ [field]: value }).eq('id', planId)
    fetchAll()
  }

  if (loading) return <div style={{textAlign:'center',padding:60,color:'#a8a69e'}}>Chargement...</div>

  const filtered = companies.filter(c => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.owner_email?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'tous' || c.sub_status === filter
    return matchSearch && matchFilter
  })

  const statusBadge = (status: string, trial_end: string) => {
    if (status === 'trial') {
      const days = Math.ceil((new Date(trial_end).getTime() - Date.now()) / 86400000)
      return <span style={{background:'rgba(91,61,245,0.1)',color:'#5B3DF5',fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:20}}>🎁 Essai · {days}j</span>
    }
    if (status === 'active') return <span style={{background:'rgba(22,163,74,0.1)',color:'#15803d',fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:20}}>✓ Actif</span>
    if (status === 'expired') return <span style={{background:'rgba(220,38,38,0.08)',color:'#dc2626',fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:20}}>✗ Expiré</span>
    return <span style={{background:'#f0eeea',color:'#6b6860',fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:20}}>Suspendu</span>
  }

  return (
    <div>
      <div style={{marginBottom:22}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6,flexWrap:'wrap'}}>
          <div style={{fontSize:20,fontWeight:800}}>🛡️ Administration RS</div>
          <span style={{background:'linear-gradient(135deg,#5B3DF5,#2563EB)',color:'#fff',fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:4,textTransform:'uppercase'}}>Super Admin</span>
        </div>
        <div style={{fontSize:13,color:'#a8a69e'}}>Gestion complète de la plateforme SaaS</div>
      </div>

      {/* TABS */}
      <div style={{display:'flex',gap:4,marginBottom:20,borderBottom:'1px solid rgba(0,0,0,0.08)',flexWrap:'wrap'}}>
        {[
          {v:'overview',l:'📊 Vue d\'ensemble'},
          {v:'companies',l:'🏢 Entreprises'},
          {v:'subscriptions',l:'💳 Abonnements'},
          {v:'plans',l:'⚙️ Plans'},
        ].map(t => (
          <button key={t.v} onClick={()=>setTab(t.v as any)}
            style={{padding:'10px 16px',fontSize:13,cursor:'pointer',border:'none',background:'transparent',color:tab===t.v?'#2563EB':'#6b6860',fontFamily:'inherit',fontWeight:tab===t.v?600:500,borderBottom:tab===t.v?'2px solid #2563EB':'2px solid transparent',marginBottom:-1}}>
            {t.l}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <>
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

          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:22}}>
            {[
              { label:'Propriétaires', val:stats.total_owners||0 },
              { label:'Utilisateurs total', val:stats.total_users||0 },
              { label:'Factures émises', val:stats.total_bills||0 },
              { label:'MRR', val:dzd(stats.mrr||0), color:'#16a34a' },
            ].map((s:any,i) => (
              <div key={i} style={{background:'rgba(255,255,255,0.6)',border:'1px solid rgba(0,0,0,0.05)',borderRadius:10,padding:'12px 16px'}}>
                <div style={{fontSize:10,color:'#a8a69e',fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px',marginBottom:4}}>{s.label}</div>
                <div style={{fontSize:16,fontWeight:700,color:s.color||'#1a1916',fontFamily:'JetBrains Mono,monospace'}}>{s.val}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* COMPANIES */}
      {tab === 'companies' && (
        <>
          <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:7,background:'#fff',border:'1px solid rgba(0,0,0,0.14)',borderRadius:6,padding:'8px 12px',flex:1,minWidth:200,maxWidth:320}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a8a69e" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input style={{background:'none',border:'none',outline:'none',color:'#1a1916',fontSize:13,fontFamily:'inherit',width:'100%'}} placeholder="Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
              {[{v:'tous',l:'Toutes'},{v:'trial',l:'Essai'},{v:'active',l:'Actifs'},{v:'expired',l:'Expirés'}].map(f => (
                <button key={f.v} onClick={()=>setFilter(f.v)}
                  style={{padding:'8px 14px',fontSize:12,borderRadius:6,cursor:'pointer',border:'1px solid rgba(0,0,0,0.14)',background:filter===f.v?'#2563EB':'#fff',color:filter===f.v?'#fff':'#6b6860',fontFamily:'inherit',fontWeight:500}}>{f.l}</button>
              ))}
            </div>
            <button onClick={()=>setShowCreateCompany(true)}
              style={{padding:'10px 16px',fontSize:13,background:'linear-gradient(135deg,#2563EB,#5B3DF5)',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontFamily:'inherit',fontWeight:600,display:'inline-flex',alignItems:'center',gap:6}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nouvelle entreprise
            </button>
          </div>

          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
                <thead>
                  <tr>{['Entreprise','Propriétaire','Plan','Statut','Users','Factures','CA','Inscrit le','Actions'].map(h => (
                    <th key={h} style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',padding:'11px 14px',borderBottom:'1px solid rgba(0,0,0,0.08)',textAlign:'left',whiteSpace:'nowrap',background:'#f8f7f5'}}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'#a8a69e'}}>Aucune entreprise</td></tr>
                  ) : filtered.map(c => (
                    <tr key={c.id} style={{borderBottom:'1px solid rgba(0,0,0,0.04)'}}>
                      <td style={{padding:'12px 14px'}}>
                        <div style={{fontSize:13,fontWeight:600}}>{c.name}</div>
                        <div style={{fontSize:11,color:'#a8a69e',marginTop:2}}>{c.email || '—'}</div>
                      </td>
                      <td style={{padding:'12px 14px'}}>
                        <div style={{fontSize:13,fontWeight:500}}>{c.owner_name || '⚠️ Pas de owner'}</div>
                        <div style={{fontSize:11,color:'#a8a69e',marginTop:2}}>{c.owner_email || '—'}</div>
                      </td>
                      <td style={{padding:'12px 14px',fontSize:12,fontWeight:600,textTransform:'capitalize'}}>{c.sub_plan}</td>
                      <td style={{padding:'12px 14px'}}>{statusBadge(c.sub_status, c.sub_trial_end)}</td>
                      <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12}}>{c.users_count}</td>
                      <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12}}>{c.bills_count}</td>
                      <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'#16a34a',fontWeight:600}}>{dzd(c.total_revenue)}</td>
                      <td style={{padding:'12px 14px',fontSize:12,color:'#6b6860',whiteSpace:'nowrap'}}>{new Date(c.created_at).toLocaleDateString('fr-DZ')}</td>
                      <td style={{padding:'12px 14px'}}>
                        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                          <button onClick={()=>openDetails(c)} style={{padding:'5px 10px',fontSize:11,borderRadius:5,cursor:'pointer',background:'rgba(37,99,235,0.08)',color:'#2563EB',border:'1px solid rgba(37,99,235,0.15)',fontFamily:'inherit',fontWeight:500}}>👁 Détails</button>
                          <button onClick={()=>{setSelectedCompany(c);setPaymentForm({...paymentForm,new_plan:c.sub_plan});setShowPayment(true)}} style={{padding:'5px 10px',fontSize:11,borderRadius:5,cursor:'pointer',background:'rgba(22,163,74,0.08)',color:'#16a34a',border:'1px solid rgba(22,163,74,0.15)',fontFamily:'inherit',fontWeight:500}}>💰 Paiement</button>
                          <button onClick={()=>extendTrial(c.id)} style={{padding:'5px 10px',fontSize:11,borderRadius:5,cursor:'pointer',background:'rgba(91,61,245,0.08)',color:'#5B3DF5',border:'1px solid rgba(91,61,245,0.15)',fontFamily:'inherit',fontWeight:500}}>+ Essai</button>
                          <button onClick={()=>suspendCompany(c.id,c.name)} style={{padding:'5px 10px',fontSize:11,borderRadius:5,cursor:'pointer',background:'rgba(217,119,6,0.08)',color:'#d97706',border:'1px solid rgba(217,119,6,0.15)',fontFamily:'inherit',fontWeight:500}}>Susp.</button>
                          <button onClick={()=>deleteCompany(c.id,c.name)} style={{padding:'5px 10px',fontSize:11,borderRadius:5,cursor:'pointer',background:'rgba(220,38,38,0.08)',color:'#dc2626',border:'1px solid rgba(220,38,38,0.15)',fontFamily:'inherit',fontWeight:500}}>Supp.</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* SUBSCRIPTIONS */}
      {tab === 'subscriptions' && (
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,padding:24}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:20}}>Tous les abonnements</div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
              <thead>
                <tr>{['Entreprise','Plan','Statut','Début','Fin','Prix/mois','Actions'].map(h => (
                  <th key={h} style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',padding:'11px 14px',borderBottom:'1px solid rgba(0,0,0,0.08)',textAlign:'left',background:'#f8f7f5'}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {companies.map(c => (
                  <tr key={c.id} style={{borderBottom:'1px solid rgba(0,0,0,0.04)'}}>
                    <td style={{padding:'12px 14px',fontSize:13,fontWeight:600}}>{c.name}</td>
                    <td style={{padding:'12px 14px',fontSize:12,textTransform:'capitalize',fontWeight:600}}>{c.sub_plan}</td>
                    <td style={{padding:'12px 14px'}}>{statusBadge(c.sub_status, c.sub_trial_end)}</td>
                    <td style={{padding:'12px 14px',fontSize:12,color:'#6b6860'}}>{c.sub_status==='trial' ? '—' : new Date(c.created_at).toLocaleDateString('fr-DZ')}</td>
                    <td style={{padding:'12px 14px',fontSize:12,color:'#6b6860'}}>{c.sub_end_date ? new Date(c.sub_end_date).toLocaleDateString('fr-DZ') : (c.sub_trial_end ? new Date(c.sub_trial_end).toLocaleDateString('fr-DZ') : '—')}</td>
                    <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:600}}>—</td>
                    <td style={{padding:'12px 14px'}}>
                      <button onClick={()=>{setSelectedCompany(c);setPaymentForm({...paymentForm,new_plan:c.sub_plan});setShowPayment(true)}} style={{padding:'5px 10px',fontSize:11,borderRadius:5,cursor:'pointer',background:'#16a34a',color:'#fff',border:'none',fontFamily:'inherit',fontWeight:600}}>💰 Enregistrer paiement</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PLANS */}
      {tab === 'plans' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:16}}>
          {plans.map(p => (
            <div key={p.id} style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:12,padding:20}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div style={{fontSize:16,fontWeight:700,textTransform:'capitalize'}}>{p.name}</div>
                <span style={{fontSize:9,background:'#f0eeea',padding:'2px 6px',borderRadius:3,color:'#6b6860',fontFamily:'monospace'}}>{p.id}</span>
              </div>
              <div style={{marginBottom:14}}>
                <label style={lbl}>Prix mensuel (DZD)</label>
                <input type="number" style={inp} value={p.price_monthly} onChange={e=>updatePlan(p.id, 'price_monthly', parseFloat(e.target.value)||0)}/>
              </div>
              <div style={{marginBottom:14}}>
                <label style={lbl}>Prix annuel (DZD)</label>
                <input type="number" style={inp} value={p.price_yearly} onChange={e=>updatePlan(p.id, 'price_yearly', parseFloat(e.target.value)||0)}/>
              </div>
              <div style={{marginBottom:14}}>
                <label style={lbl}>Max utilisateurs</label>
                <input type="number" style={inp} value={p.max_users} onChange={e=>updatePlan(p.id, 'max_users', parseInt(e.target.value)||0)}/>
              </div>
              <div>
                <label style={lbl}>Features (JSON)</label>
                <textarea style={{...inp,minHeight:80,fontSize:11,fontFamily:'monospace'}} 
                  value={JSON.stringify(p.features, null, 2)}
                  onChange={e=>{
                    try { updatePlan(p.id, 'features', JSON.parse(e.target.value)) } catch(err) {}
                  }}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREATE COMPANY */}
      {showCreateCompany && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}} onClick={()=>setShowCreateCompany(false)}>
          <div style={{background:'#fff',borderRadius:14,padding:24,maxWidth:540,width:'100%',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:18,fontWeight:700,marginBottom:4}}>Créer une nouvelle entreprise</div>
            <div style={{fontSize:12,color:'#a8a69e',marginBottom:20}}>Le propriétaire devra ensuite créer son compte via /signup avec cet email</div>
            
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lbl}>Nom de l'entreprise *</label>
                <input style={inp} value={createForm.company_name} onChange={e=>setCreateForm({...createForm,company_name:e.target.value})}/>
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lbl}>Nom complet propriétaire *</label>
                <input style={inp} value={createForm.owner_full_name} onChange={e=>setCreateForm({...createForm,owner_full_name:e.target.value})}/>
              </div>
              <div>
                <label style={lbl}>Email propriétaire *</label>
                <input type="email" style={inp} value={createForm.owner_email} onChange={e=>setCreateForm({...createForm,owner_email:e.target.value})}/>
              </div>
              <div>
                <label style={lbl}>Téléphone</label>
                <input style={inp} value={createForm.owner_phone} onChange={e=>setCreateForm({...createForm,owner_phone:e.target.value})}/>
              </div>
            </div>

            <div style={{padding:16,background:'#f8f7f5',borderRadius:8,marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:12}}>Abonnement</div>
              <div style={{marginBottom:10}}>
                <label style={{fontSize:12,display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                  <input type="checkbox" checked={createForm.start_active} onChange={e=>setCreateForm({...createForm,start_active:e.target.checked})}/>
                  Démarrer immédiatement (paiement déjà reçu)
                </label>
              </div>
              {createForm.start_active ? (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                  <div>
                    <label style={lbl}>Plan</label>
                    <select style={inp} value={createForm.plan} onChange={e=>setCreateForm({...createForm,plan:e.target.value})}>
                      {plans.filter(p=>p.id!=='trial').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Mois</label>
                    <input type="number" min="1" style={inp} value={createForm.duration_months} onChange={e=>setCreateForm({...createForm,duration_months:parseInt(e.target.value)||1})}/>
                  </div>
                  <div>
                    <label style={lbl}>Prix/mois (DZD)</label>
                    <input type="number" style={inp} value={createForm.price_monthly} onChange={e=>setCreateForm({...createForm,price_monthly:parseFloat(e.target.value)||0})}/>
                  </div>
                </div>
              ) : (
                <div style={{fontSize:12,color:'#6b6860'}}>🎁 Période d'essai gratuite de 14 jours</div>
              )}
            </div>

            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowCreateCompany(false)} style={{padding:'10px 18px',fontSize:13,borderRadius:6,cursor:'pointer',background:'transparent',color:'#6b6860',border:'1px solid rgba(0,0,0,0.14)',fontFamily:'inherit'}}>Annuler</button>
              <button onClick={createCompany} style={{padding:'10px 18px',fontSize:13,borderRadius:6,cursor:'pointer',background:'linear-gradient(135deg,#2563EB,#5B3DF5)',color:'#fff',border:'none',fontFamily:'inherit',fontWeight:600}}>✓ Créer l'entreprise</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAYMENT */}
      {showPayment && selectedCompany && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}} onClick={()=>setShowPayment(false)}>
          <div style={{background:'#fff',borderRadius:14,padding:24,maxWidth:500,width:'100%'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:18,fontWeight:700,marginBottom:4}}>Enregistrer un paiement</div>
            <div style={{fontSize:12,color:'#a8a69e',marginBottom:20}}>Pour : <strong style={{color:'#1a1916'}}>{selectedCompany.name}</strong></div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div>
                <label style={lbl}>Montant total (DZD) *</label>
                <input type="number" style={inp} value={paymentForm.amount} onChange={e=>setPaymentForm({...paymentForm,amount:parseFloat(e.target.value)||0})}/>
              </div>
              <div>
                <label style={lbl}>Durée (mois) *</label>
                <input type="number" min="1" style={inp} value={paymentForm.months} onChange={e=>setPaymentForm({...paymentForm,months:parseInt(e.target.value)||1})}/>
              </div>
              <div>
                <label style={lbl}>Plan</label>
                <select style={inp} value={paymentForm.new_plan} onChange={e=>setPaymentForm({...paymentForm,new_plan:e.target.value})}>
                  <option value="">Garder le plan actuel</option>
                  {plans.filter(p=>p.id!=='trial').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Méthode</label>
                <select style={inp} value={paymentForm.method} onChange={e=>setPaymentForm({...paymentForm,method:e.target.value})}>
                  <option>Virement bancaire</option>
                  <option>BaridiMob</option>
                  <option>CCP</option>
                  <option>Espèces</option>
                  <option>Chèque</option>
                </select>
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lbl}>Référence (N° virement)</label>
                <input style={inp} value={paymentForm.reference} onChange={e=>setPaymentForm({...paymentForm,reference:e.target.value})}/>
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lbl}>Notes</label>
                <textarea style={{...inp,minHeight:60}} value={paymentForm.notes} onChange={e=>setPaymentForm({...paymentForm,notes:e.target.value})}/>
              </div>
            </div>

            <div style={{padding:12,background:'rgba(22,163,74,0.05)',border:'1px solid rgba(22,163,74,0.15)',borderRadius:8,fontSize:12,color:'#15803d',marginBottom:16}}>
              <strong>Résumé :</strong> {dzd(paymentForm.amount)} pour {paymentForm.months} mois ({dzd(paymentForm.amount/Math.max(paymentForm.months,1))}/mois)
            </div>

            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowPayment(false)} style={{padding:'10px 18px',fontSize:13,borderRadius:6,cursor:'pointer',background:'transparent',color:'#6b6860',border:'1px solid rgba(0,0,0,0.14)',fontFamily:'inherit'}}>Annuler</button>
              <button onClick={recordPayment} style={{padding:'10px 18px',fontSize:13,borderRadius:6,cursor:'pointer',background:'#16a34a',color:'#fff',border:'none',fontFamily:'inherit',fontWeight:600}}>✓ Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAILS */}
      {showDetails && selectedCompany && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}} onClick={()=>setShowDetails(false)}>
          <div style={{background:'#fff',borderRadius:14,padding:24,maxWidth:700,width:'100%',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
              <div>
                <div style={{fontSize:20,fontWeight:700}}>{selectedCompany.name}</div>
                <div style={{fontSize:12,color:'#a8a69e',marginTop:4}}>Propriétaire : {selectedCompany.owner_email || '—'}</div>
              </div>
              <button onClick={()=>setShowDetails(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:'#a8a69e'}}>×</button>
            </div>

            <div style={{marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>💰 Historique des paiements</div>
              {companyPayments.length === 0 ? (
                <div style={{fontSize:12,color:'#a8a69e',padding:16,background:'#f8f7f5',borderRadius:8,textAlign:'center'}}>Aucun paiement enregistré</div>
              ) : (
                <div style={{background:'#f8f7f5',borderRadius:8,overflow:'hidden'}}>
                  {companyPayments.map((p,i) => (
                    <div key={p.id} style={{padding:'10px 14px',borderBottom:i<companyPayments.length-1?'1px solid rgba(0,0,0,0.05)':'none',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600}}>{dzd(p.amount)}</div>
                        <div style={{fontSize:11,color:'#6b6860',marginTop:2}}>{p.method} {p.reference && `· ${p.reference}`}</div>
                        {p.notes && <div style={{fontSize:11,color:'#a8a69e',marginTop:2}}>{p.notes}</div>}
                      </div>
                      <div style={{textAlign:'right',fontSize:11,color:'#a8a69e'}}>
                        <div>{new Date(p.created_at).toLocaleDateString('fr-DZ')}</div>
                        <div style={{marginTop:2}}>Jusqu'au {new Date(p.period_end).toLocaleDateString('fr-DZ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>📜 Historique des actions</div>
              {companyHistory.length === 0 ? (
                <div style={{fontSize:12,color:'#a8a69e',padding:16,background:'#f8f7f5',borderRadius:8,textAlign:'center'}}>Aucun historique</div>
              ) : (
                <div style={{background:'#f8f7f5',borderRadius:8,overflow:'hidden',maxHeight:200,overflowY:'auto'}}>
                  {companyHistory.map((h,i) => (
                    <div key={h.id} style={{padding:'8px 14px',borderBottom:i<companyHistory.length-1?'1px solid rgba(0,0,0,0.05)':'none',fontSize:11}}>
                      <div style={{display:'flex',justifyContent:'space-between'}}>
                        <strong>{h.action}</strong>
                        <span style={{color:'#a8a69e'}}>{new Date(h.created_at).toLocaleString('fr-DZ')}</span>
                      </div>
                      {h.notes && <div style={{color:'#6b6860',marginTop:2}}>{h.notes}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}