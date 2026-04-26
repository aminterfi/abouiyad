'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

function dzd(v:number){return (v||0).toLocaleString('fr-DZ',{minimumFractionDigits:0})+' DZD'}

export default function CompanyDetailPage() {
  const router = useRouter()
  const { slug, companyId } = useParams() as { slug: string; companyId: string }
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  // Forms
  const [companyForm, setCompanyForm] = useState({name:'', slug:'', logo_url:'', primary_color:''})
  const [ownerForm, setOwnerForm] = useState({email:'', full_name:''})
  const [extendDays, setExtendDays] = useState(30)
  const [activatePlan, setActivatePlan] = useState({plan:'pro', price:'2000', months:12})

  useEffect(()=>{
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    if (!u.is_platform_admin) {
      router.push(`/${slug}/dashboard`)
      return
    }
    load()
  },[companyId])

  async function load() {
    setLoading(true)
    const { data: result, error } = await supabase.rpc('admin_get_company_details', {p_company_id: companyId})
    if (error) {setErr(error.message); setLoading(false); return}
    setData(result)
    if (result?.company) setCompanyForm({
      name: result.company.name||'',
      slug: result.company.slug||'',
      logo_url: result.settings?.logo_url||'',
      primary_color: result.settings?.primary_color||'#2563EB'
    })
    if (result?.owner) setOwnerForm({
      email: result.owner.email||'',
      full_name: result.owner.full_name||''
    })
    setLoading(false)
  }

  function flash(m:string, isErr=false){
    if(isErr) setErr(m); else setMsg(m)
    setTimeout(()=>{setMsg(''); setErr('')}, 4000)
  }

  async function saveCompany() {
    setSaving(true); setErr('')
    const { error } = await supabase.rpc('admin_update_company', {
      p_company_id: companyId,
      p_name: companyForm.name,
      p_slug: companyForm.slug,
      p_logo_url: companyForm.logo_url||null,
      p_primary_color: companyForm.primary_color,
      p_company_name_settings: companyForm.name,
    })
    if(error){flash(error.message,true);setSaving(false);return}
    flash('✅ Entreprise mise à jour')
    load()
    setSaving(false)
  }

  async function saveOwner() {
    setSaving(true); setErr('')
    const { error } = await supabase.rpc('admin_update_owner', {
      p_company_id: companyId,
      p_email: ownerForm.email,
      p_full_name: ownerForm.full_name,
    })
    if(error){flash(error.message,true);setSaving(false);return}
    flash('✅ Owner mis à jour (email côté auth à modifier manuellement si nécessaire)')
    load()
    setSaving(false)
  }

  async function resetPassword() {
    if(!data?.owner?.email) return
    if(!confirm(`Envoyer un email de réinitialisation à ${data.owner.email} ?`)) return
    setSaving(true)
    const { error } = await supabase.auth.resetPasswordForEmail(data.owner.email, {
      redirectTo: `${window.location.origin}/`
    })
    if(error){flash(error.message,true);setSaving(false);return}
    flash(`✅ Email envoyé à ${data.owner.email}`)
    setSaving(false)
  }

  async function extendTrial() {
    setSaving(true)
    const { error } = await supabase.rpc('admin_extend_trial', {
      p_company_id: companyId, p_days: extendDays
    })
    if(error){flash(error.message,true);setSaving(false);return}
    flash(`✅ Trial prolongé de ${extendDays} jours`)
    load(); setSaving(false)
  }

  async function activate() {
    setSaving(true)
    const { error } = await supabase.rpc('admin_activate_subscription', {
      p_company_id: companyId,
      p_plan: activatePlan.plan,
      p_price: parseFloat(String(activatePlan.price)),
      p_duration_months: activatePlan.months,
    })
    if(error){flash(error.message,true);setSaving(false);return}
    flash('✅ Abonnement activé')
    load(); setSaving(false)
  }

  async function suspend() {
    if(!confirm('Suspendre cette entreprise ?')) return
    setSaving(true)
    const { error } = await supabase.rpc('admin_suspend_company', {p_company_id: companyId})
    if(error){flash(error.message,true);setSaving(false);return}
    flash('⏸ Entreprise suspendue')
    load(); setSaving(false)
  }

  async function reactivate() {
    setSaving(true)
    const { error } = await supabase.rpc('admin_reactivate_company', {p_company_id: companyId})
    if(error){flash(error.message,true);setSaving(false);return}
    flash('▶ Entreprise réactivée')
    load(); setSaving(false)
  }

  async function deleteCompany() {
    const confirm1 = prompt(`⚠️ DANGER : Supprimer DÉFINITIVEMENT "${data?.company?.name}" et TOUTES ses données ?\n\nTapez "SUPPRIMER" pour confirmer :`)
    if(confirm1 !== 'SUPPRIMER') return
    if(!confirm('Dernière confirmation. Cette action est IRRÉVERSIBLE.')) return
    setSaving(true)
    const { error } = await supabase.rpc('admin_delete_company', {p_company_id: companyId})
    if(error){flash(error.message,true);setSaving(false);return}
    alert('Entreprise supprimée')
    router.push(`/${slug}/dashboard/admin-platform`)
  }

  if(loading) return <div style={{padding:30,textAlign:'center',color:'#a8a69e'}}>Chargement...</div>
  if(!data?.company) return <div style={{padding:30,textAlign:'center',color:'#dc2626'}}>Entreprise introuvable</div>

  const sub = data.subscription
  const stats = data.stats || {}
  const inp:React.CSSProperties = {width:'100%',padding:'9px 12px',fontSize:13,border:'1px solid rgba(0,0,0,0.14)',borderRadius:6,fontFamily:'inherit',outline:'none'}
  const lbl:React.CSSProperties = {fontSize:11,color:'#6b6860',marginBottom:5,fontWeight:500,display:'block'}
  const card:React.CSSProperties = {background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:20,marginBottom:14}
  const sectionTitle:React.CSSProperties = {fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:14,display:'flex',alignItems:'center',gap:8}

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18,flexWrap:'wrap',gap:10}}>
        <div>
          <button onClick={()=>router.push(`/${slug}/dashboard/admin-platform`)}
            style={{fontSize:12,color:'#6b6860',background:'transparent',border:'none',cursor:'pointer',marginBottom:6,padding:0,fontFamily:'inherit'}}>← Retour à la liste</button>
          <div style={{fontSize:20,fontWeight:700,color:'#1a1916'}}>{data.company.name}</div>
          <div style={{fontSize:12,color:'#a8a69e',fontFamily:'JetBrains Mono,monospace',marginTop:2}}>/{data.company.slug} · ID: {data.company.id?.slice(0,8)}</div>
        </div>
      </div>

      {msg && <div style={{background:'rgba(22,163,74,0.08)',border:'1px solid rgba(22,163,74,0.2)',color:'#15803d',padding:'11px 14px',borderRadius:6,fontSize:13,marginBottom:14}}>{msg}</div>}
      {err && <div style={{background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.2)',color:'#dc2626',padding:'11px 14px',borderRadius:6,fontSize:13,marginBottom:14}}>⚠️ {err}</div>}

      {/* STATS */}
      <div style={card}>
        <div style={sectionTitle}>📊 Statistiques</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:12}}>
          {[
            {l:'Clients',v:stats.nb_clients||0,c:'#2563EB'},
            {l:'Factures',v:stats.nb_bills||0,c:'#7c3aed'},
            {l:'Paiements',v:stats.nb_payments||0,c:'#16a34a'},
            {l:'Produits',v:stats.nb_products||0,c:'#d97706'},
            {l:'Utilisateurs',v:stats.nb_users||0,c:'#1a1916'},
            {l:'CA encaissé',v:dzd(stats.total_revenue||0),c:'#16a34a',mono:true},
            {l:'CA facturé',v:dzd(stats.total_billed||0),c:'#5B3DF5',mono:true},
          ].map((s:any,i)=>(
            <div key={i} style={{textAlign:'center'}}>
              <div style={{fontSize:18,fontWeight:700,color:s.c,fontFamily:s.mono?'JetBrains Mono,monospace':'inherit'}}>{s.v}</div>
              <div style={{fontSize:10,color:'#a8a69e',marginTop:3}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* INFOS ENTREPRISE */}
      <div style={card}>
        <div style={sectionTitle}>🏢 Informations entreprise</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
          <div>
            <label style={lbl}>Nom de l'entreprise</label>
            <input style={inp} value={companyForm.name} onChange={e=>setCompanyForm({...companyForm,name:e.target.value})}/>
          </div>
          <div>
            <label style={lbl}>Slug (URL)</label>
            <input style={{...inp,fontFamily:'JetBrains Mono,monospace'}} value={companyForm.slug} 
              onChange={e=>setCompanyForm({...companyForm,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'-')})}/>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
          <div>
            <label style={lbl}>URL Logo</label>
            <input style={inp} placeholder="https://..." value={companyForm.logo_url} onChange={e=>setCompanyForm({...companyForm,logo_url:e.target.value})}/>
          </div>
          <div>
            <label style={lbl}>Couleur primaire</label>
            <div style={{display:'flex',gap:6}}>
              <input type="color" style={{width:46,height:36,border:'1px solid rgba(0,0,0,0.14)',borderRadius:6,cursor:'pointer'}}
                value={companyForm.primary_color} onChange={e=>setCompanyForm({...companyForm,primary_color:e.target.value})}/>
              <input style={{...inp,fontFamily:'JetBrains Mono,monospace'}} value={companyForm.primary_color} onChange={e=>setCompanyForm({...companyForm,primary_color:e.target.value})}/>
            </div>
          </div>
        </div>
        <button onClick={saveCompany} disabled={saving}
          style={{padding:'9px 18px',fontSize:13,fontWeight:600,background:'#2563EB',color:'#fff',border:'none',borderRadius:6,cursor:saving?'not-allowed':'pointer',fontFamily:'inherit'}}>
          {saving?'Enregistrement...':'💾 Enregistrer'}
        </button>
      </div>

      {/* OWNER */}
      <div style={card}>
        <div style={sectionTitle}>👤 Propriétaire</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
          <div>
            <label style={lbl}>Nom complet</label>
            <input style={inp} value={ownerForm.full_name} onChange={e=>setOwnerForm({...ownerForm,full_name:e.target.value})}/>
          </div>
          <div>
            <label style={lbl}>Email</label>
            <input style={inp} type="email" value={ownerForm.email} onChange={e=>setOwnerForm({...ownerForm,email:e.target.value})}/>
            <div style={{fontSize:10,color:'#d97706',marginTop:4}}>⚠ Modifie le nom dans la table owners. L'email Auth doit être changé via Supabase Dashboard.</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={saveOwner} disabled={saving}
            style={{padding:'9px 18px',fontSize:13,fontWeight:600,background:'#2563EB',color:'#fff',border:'none',borderRadius:6,cursor:saving?'not-allowed':'pointer',fontFamily:'inherit'}}>
            💾 Enregistrer
          </button>
          <button onClick={resetPassword} disabled={saving}
            style={{padding:'9px 18px',fontSize:13,fontWeight:600,background:'#fff',color:'#d97706',border:'1px solid rgba(217,119,6,0.3)',borderRadius:6,cursor:'pointer',fontFamily:'inherit'}}>
            🔑 Reset password
          </button>
        </div>
      </div>

      {/* SUBSCRIPTION */}
      <div style={card}>
        <div style={sectionTitle}>💳 Abonnement</div>
        {sub ? (
          <div style={{marginBottom:18,padding:14,background:'#f8f7f5',borderRadius:8}}>
            <div style={{fontSize:12,color:'#6b6860'}}>Statut actuel</div>
            <div style={{fontSize:18,fontWeight:700,marginTop:4,color:sub.status==='active'?'#16a34a':sub.status==='trial'?'#d97706':'#dc2626'}}>
              {sub.status?.toUpperCase()} · {sub.plan || '—'}
            </div>
            {sub.trial_end && <div style={{fontSize:11,color:'#6b6860',marginTop:6}}>Trial jusqu'au {new Date(sub.trial_end).toLocaleDateString('fr-DZ')}</div>}
            {sub.end_date && <div style={{fontSize:11,color:'#6b6860',marginTop:2}}>Échéance : {new Date(sub.end_date).toLocaleDateString('fr-DZ')}</div>}
            {sub.price_monthly > 0 && <div style={{fontSize:11,color:'#6b6860',marginTop:2}}>Prix : {dzd(sub.price_monthly)}/mois</div>}
          </div>
        ) : (
          <div style={{padding:14,background:'#fff7ed',border:'1px solid #fb923c',borderRadius:8,marginBottom:14,fontSize:13,color:'#c2410c'}}>
            ⚠ Aucun abonnement trouvé
          </div>
        )}

        <div style={{borderTop:'1px solid rgba(0,0,0,0.05)',paddingTop:14,marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:600,marginBottom:8}}>Prolonger le trial</div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <select value={extendDays} onChange={e=>setExtendDays(parseInt(e.target.value))}
              style={{...inp,width:120}}>
              <option value="7">+7 jours</option>
              <option value="14">+14 jours</option>
              <option value="30">+30 jours</option>
              <option value="60">+60 jours</option>
              <option value="90">+90 jours</option>
              <option value="365">+1 an</option>
            </select>
            <button onClick={extendTrial} disabled={saving}
              style={{padding:'9px 18px',fontSize:13,fontWeight:600,background:'#d97706',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontFamily:'inherit'}}>
              ⏰ Prolonger
            </button>
          </div>
        </div>

        <div style={{borderTop:'1px solid rgba(0,0,0,0.05)',paddingTop:14,marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:600,marginBottom:8}}>Activer un abonnement payant</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:8,alignItems:'flex-end'}}>
            <div>
              <label style={lbl}>Plan</label>
              <select style={inp} value={activatePlan.plan} onChange={e=>setActivatePlan({...activatePlan,plan:e.target.value})}>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Prix/mois (DZD)</label>
              <input type="number" style={inp} value={activatePlan.price} onChange={e=>setActivatePlan({...activatePlan,price:e.target.value})}/>
            </div>
            <div>
              <label style={lbl}>Durée (mois)</label>
              <input type="number" style={inp} value={activatePlan.months} onChange={e=>setActivatePlan({...activatePlan,months:parseInt(e.target.value)||1})}/>
            </div>
            <button onClick={activate} disabled={saving}
              style={{padding:'9px 18px',fontSize:13,fontWeight:600,background:'#16a34a',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontFamily:'inherit'}}>
              ✓ Activer
            </button>
          </div>
        </div>

        <div style={{borderTop:'1px solid rgba(0,0,0,0.05)',paddingTop:14,display:'flex',gap:8}}>
          {sub?.status === 'suspended' ? (
            <button onClick={reactivate} disabled={saving}
              style={{padding:'9px 18px',fontSize:13,fontWeight:600,background:'#16a34a',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontFamily:'inherit'}}>
              ▶ Réactiver
            </button>
          ) : (
            <button onClick={suspend} disabled={saving}
              style={{padding:'9px 18px',fontSize:13,fontWeight:600,background:'#fff',color:'#dc2626',border:'1px solid rgba(220,38,38,0.3)',borderRadius:6,cursor:'pointer',fontFamily:'inherit'}}>
              ⏸ Suspendre
            </button>
          )}
        </div>
      </div>

      {/* DANGER ZONE */}
      <div style={{...card,border:'2px solid rgba(220,38,38,0.2)',background:'rgba(220,38,38,0.02)'}}>
        <div style={{...sectionTitle,color:'#dc2626'}}>⚠️ Zone dangereuse</div>
        <div style={{fontSize:12,color:'#6b6860',marginBottom:12,lineHeight:1.6}}>
          La suppression est <strong style={{color:'#dc2626'}}>irréversible</strong>. Toutes les données de l'entreprise seront perdues : clients, factures, paiements, produits, utilisateurs, paramètres, historique...
        </div>
        <button onClick={deleteCompany} disabled={saving}
          style={{padding:'10px 20px',fontSize:13,fontWeight:600,background:'#dc2626',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontFamily:'inherit'}}>
          🗑 Supprimer définitivement cette entreprise
        </button>
      </div>
    </div>
  )
}