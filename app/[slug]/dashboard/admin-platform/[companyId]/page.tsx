'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { getCommercialDocumentMeta, getDeclarationMeta } from '@/lib/commercial-documents'

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
  const [workspaceForm, setWorkspaceForm] = useState({ workspace_type: 'cabinet', parent_cabinet_id: '' })
  const [modules, setModules] = useState<string[]>([])
  const [commercial, setCommercial] = useState<any>(null)

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
    if (result?.company) setWorkspaceForm({
      workspace_type: result.company.workspace_type || 'cabinet',
      parent_cabinet_id: result.company.parent_cabinet_id || '',
    })
    if (result?.owner) setOwnerForm({
      email: result.owner.email||'',
      full_name: result.owner.full_name||''
    })
    const { data: accessRows } = await supabase
      .from('company_module_access')
      .select('module_key,is_enabled')
      .eq('company_id', companyId)
    setModules((accessRows || []).filter((row: any) => row.is_enabled !== false).map((row: any) => row.module_key))
    await loadCommercial()
    setLoading(false)
  }

  async function loadCommercial() {
    try {
      const response = await fetch(`/api/cabinet/operational?kind=commercial&slug=${slug}&companyId=${companyId}`, {
        cache: 'no-store',
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || 'Commercial data unavailable')
      setCommercial(result)
    } catch (error: any) {
      setCommercial(null)
      setErr((prev) => prev || error?.message || 'Commercial data unavailable')
    }
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

  async function saveWorkspace() {
    setSaving(true)
    const { error } = await supabase.rpc('admin_update_company_workspace', {
      p_company_id: companyId,
      p_workspace_type: workspaceForm.workspace_type,
      p_parent_cabinet_id: workspaceForm.workspace_type === 'client' ? (workspaceForm.parent_cabinet_id || null) : null,
    })
    if (error) {
      flash(error.message, true)
      setSaving(false)
      return
    }
    flash('Espace mis a jour')
    load()
    setSaving(false)
  }

  async function saveModules() {
    setSaving(true)
    const { error } = await supabase.rpc('admin_set_company_module_access', {
      p_company_id: companyId,
      p_modules: modules,
    })
    if (error) {
      flash(error.message, true)
      setSaving(false)
      return
    }
    flash('Modules mis a jour')
    setSaving(false)
  }

  async function resetPassword() {
    if(!data?.owner?.email) return
    if(!confirm(`Envoyer un email de réinitialisation à ${data.owner.email} ?`)) return
    setSaving(true)
    const { error } = await supabase.auth.resetPasswordForEmail(data.owner.email, {
      redirectTo: `${window.location.origin}/reset-password?slug=${encodeURIComponent(data.company.slug || slug)}`
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
  const text = 'var(--ws-text)'
  const muted = 'var(--ws-muted)'
  const faint = 'var(--ws-faint)'
  const panel = 'var(--ws-panel)'
  const panel2 = 'var(--ws-panel-2)'
  const panel3 = 'var(--ws-panel-3)'
  const border = 'var(--ws-border)'
  const accent = 'var(--ws-accent)'
  const inp:React.CSSProperties = {width:'100%',padding:'10px 12px',fontSize:13,border:`1px solid ${border}`,borderRadius:8,fontFamily:'inherit',outline:'none',background:panel2,color:text}
  const lbl:React.CSSProperties = {fontSize:11,color:muted,marginBottom:6,fontWeight:700,display:'block'}
  const card:React.CSSProperties = {background:panel,border:`1px solid ${border}`,borderRadius:12,padding:20,marginBottom:14,color:text}
  const sectionTitle:React.CSSProperties = {fontSize:11,fontWeight:800,color:faint,textTransform:'uppercase',letterSpacing:'.6px',marginBottom:14,display:'flex',alignItems:'center',gap:8}
  const moduleOptions = ['dashboard','billing','clients','payments','catalog','stock','tickets','service_requests','documents','users','settings']

  return (
    <div style={{color:text}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18,flexWrap:'wrap',gap:10}}>
        <div>
          <button onClick={()=>router.push(`/${slug}/dashboard/admin-platform`)}
            style={{fontSize:12,color:muted,background:'transparent',border:'none',cursor:'pointer',marginBottom:6,padding:0,fontFamily:'inherit'}}>← Retour à la liste</button>
          <div style={{fontSize:20,fontWeight:700,color:text}}>{data.company.name}</div>
          <div style={{fontSize:12,color:faint,fontFamily:'JetBrains Mono,monospace',marginTop:2}}>/{data.company.slug} · ID: {data.company.id?.slice(0,8)}</div>
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
              <div style={{fontSize:10,color:faint,marginTop:3}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={sectionTitle}>Workflow commercial</div>
        <div style={{fontSize:12,color:muted,marginBottom:16,lineHeight:1.6}}>
          Le client classe ses pièces entre déclaré et non déclaré. Le cabinet suit ensuite le flux recommandé:
          <strong style={{color:text}}> Devis → Bon de commande → Bon de livraison → Facture</strong>.
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:18}}>
          {[
            { label:'Documents', value:commercial?.summary?.total || 0, color:text },
            { label:'Déclarés', value:commercial?.summary?.declared || 0, color:'#15803d' },
            { label:'À vérifier', value:commercial?.summary?.pendingDeclaration || 0, color:'#d97706' },
            { label:'Montant total', value:dzd(commercial?.summary?.totalAmount || 0), color:'#2563EB', mono:true },
          ].map((item:any) => (
            <div key={item.label} style={{padding:'14px 16px',border:`1px solid ${border}`,borderRadius:10,background:panel2}}>
              <div style={{fontSize:11,color:faint,textTransform:'uppercase',marginBottom:6}}>{item.label}</div>
              <div style={{fontSize:18,fontWeight:700,color:item.color,fontFamily:item.mono?'JetBrains Mono,monospace':'inherit'}}>{item.value}</div>
            </div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10,marginBottom:18}}>
          {(['quote','purchase_order','delivery_note','invoice'] as const).map((type) => {
            const meta = getCommercialDocumentMeta(type)
            return (
              <div key={type} style={{padding:'12px 14px',borderRadius:10,border:`1px solid ${meta.accent}22`,background:meta.light}}>
                <div style={{fontSize:10,fontWeight:800,color:meta.accent,textTransform:'uppercase'}}>{meta.shortLabel}</div>
                <div style={{fontSize:13,fontWeight:700,color:text,marginTop:6}}>{meta.label}</div>
                <div style={{fontSize:18,fontWeight:800,color:meta.accent,marginTop:8}}>
                  {commercial?.summary?.byType?.[type] || 0}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{fontSize:12,fontWeight:700,color:text,marginBottom:10}}>Derniers documents à traiter</div>
        <div style={{display:'grid',gap:10}}>
          {(commercial?.rows || []).length === 0 ? (
            <div style={{padding:'16px 18px',border:`1px dashed ${border}`,borderRadius:10,fontSize:13,color:muted,background:panel2}}>
              Aucun document commercial pour cette entreprise pour le moment.
            </div>
          ) : (
            (commercial?.rows || []).map((row: any) => {
              const meta = getCommercialDocumentMeta(row.document_type)
              const declaration = getDeclarationMeta(row.client_declared)
              return (
                <div key={row.id} style={{display:'grid',gridTemplateColumns:'1.2fr .8fr .8fr .9fr',gap:12,alignItems:'center',padding:'14px 16px',border:`1px solid ${border}`,borderRadius:10,background:panel2}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:text}}>{row.invoice_number}</div>
                    <div style={{fontSize:11,color:muted,marginTop:4}}>
                      {row.clients?.full_name || 'Client'} · {new Date(row.created_at).toLocaleDateString('fr-DZ')}
                    </div>
                    {row.client_declaration_note ? (
                      <div style={{fontSize:11,color:muted,marginTop:6,lineHeight:1.5}}>{row.client_declaration_note}</div>
                    ) : null}
                  </div>
                  <div>
                    <div style={{display:'inline-flex',padding:'4px 8px',borderRadius:999,border:`1px solid ${meta.accent}22`,background:meta.light,color:meta.accent,fontSize:11,fontWeight:700}}>
                      {meta.label}
                    </div>
                  </div>
                  <div>
                    <div style={{display:'inline-flex',padding:'4px 8px',borderRadius:999,border:`1px solid ${declaration.color}22`,background:declaration.bg,color:declaration.color,fontSize:11,fontWeight:700}}>
                      {declaration.label}
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:13,fontWeight:700,color:text,fontFamily:'JetBrains Mono,monospace'}}>{dzd(row.total_amount || 0)}</div>
                    <div style={{fontSize:11,color:muted,marginTop:4}}>
                      Solde {dzd((row.balance ?? 0))}
                    </div>
                  </div>
                </div>
              )
            })
          )}
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
              <input type="color" style={{width:46,height:40,border:`1px solid ${border}`,borderRadius:8,cursor:'pointer',background:panel2}}
                value={companyForm.primary_color} onChange={e=>setCompanyForm({...companyForm,primary_color:e.target.value})}/>
              <input style={{...inp,fontFamily:'JetBrains Mono,monospace'}} value={companyForm.primary_color} onChange={e=>setCompanyForm({...companyForm,primary_color:e.target.value})}/>
            </div>
          </div>
        </div>
        <button onClick={saveCompany} disabled={saving}
          style={{padding:'10px 18px',fontSize:13,fontWeight:700,background:accent,color:'#fff',border:'none',borderRadius:8,cursor:saving?'not-allowed':'pointer',fontFamily:'inherit'}}>
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
            style={{padding:'10px 18px',fontSize:13,fontWeight:700,background:accent,color:'#fff',border:'none',borderRadius:8,cursor:saving?'not-allowed':'pointer',fontFamily:'inherit'}}>
            💾 Enregistrer
          </button>
          <button onClick={resetPassword} disabled={saving}
            style={{padding:'10px 18px',fontSize:13,fontWeight:700,background:'transparent',color:'#d97706',border:'1px solid rgba(217,119,6,0.35)',borderRadius:8,cursor:'pointer',fontFamily:'inherit'}}>
            🔑 Reset password
          </button>
        </div>
      </div>

      <div style={card}>
        <div style={sectionTitle}>Structure workspace</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
          <div>
            <label style={lbl}>Type de workspace</label>
            <select
              style={inp}
              value={workspaceForm.workspace_type}
              onChange={e=>setWorkspaceForm({...workspaceForm,workspace_type:e.target.value})}
            >
              <option value="cabinet">Cabinet</option>
              <option value="client">Client</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Cabinet parent</label>
            <input
              style={inp}
              value={workspaceForm.parent_cabinet_id}
              onChange={e=>setWorkspaceForm({...workspaceForm,parent_cabinet_id:e.target.value})}
              placeholder="UUID du cabinet parent"
              disabled={workspaceForm.workspace_type !== 'client'}
            />
          </div>
        </div>
        <button onClick={saveWorkspace} disabled={saving}
          style={{padding:'10px 18px',fontSize:13,fontWeight:700,background:panel3,color:text,border:`1px solid ${border}`,borderRadius:8,cursor:'pointer',fontFamily:'inherit'}}>
          Enregistrer la structure
        </button>
      </div>

      <div style={card}>
        <div style={sectionTitle}>Modules client</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:10,marginBottom:14}}>
          {moduleOptions.map((moduleKey) => {
            const active = modules.includes(moduleKey)
            return (
              <label key={moduleKey} style={{display:'flex',alignItems:'center',gap:10,fontSize:12,cursor:'pointer',padding:'11px 12px',border:`1px solid ${active ? 'rgba(96,165,250,0.32)' : border}`,borderRadius:8,background:active?'rgba(96,165,250,0.12)':panel2,color:text}}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => {
                    if (e.target.checked) setModules((prev) => Array.from(new Set([...prev, moduleKey])))
                    else setModules((prev) => prev.filter((item) => item !== moduleKey))
                  }}
                />
                <span style={{fontWeight:700,color:text}}>{moduleKey}</span>
              </label>
            )
          })}
        </div>
        <button onClick={saveModules} disabled={saving}
          style={{padding:'10px 18px',fontSize:13,fontWeight:700,background:accent,color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'inherit'}}>
          Enregistrer les modules
        </button>
      </div>

      {/* SUBSCRIPTION */}
      <div style={card}>
        <div style={sectionTitle}>💳 Abonnement</div>
        {sub ? (
          <div style={{marginBottom:18,padding:14,background:panel2,border:`1px solid ${border}`,borderRadius:8}}>
            <div style={{fontSize:12,color:muted}}>Statut actuel</div>
            <div style={{fontSize:18,fontWeight:700,marginTop:4,color:sub.status==='active'?'#16a34a':sub.status==='trial'?'#d97706':'#dc2626'}}>
              {sub.status?.toUpperCase()} · {sub.plan || '—'}
            </div>
            {sub.trial_end && <div style={{fontSize:11,color:muted,marginTop:6}}>Trial jusqu'au {new Date(sub.trial_end).toLocaleDateString('fr-DZ')}</div>}
            {sub.end_date && <div style={{fontSize:11,color:'#6b6860',marginTop:2}}>Échéance : {new Date(sub.end_date).toLocaleDateString('fr-DZ')}</div>}
            {sub.price_monthly > 0 && <div style={{fontSize:11,color:muted,marginTop:2}}>Prix : {dzd(sub.price_monthly)}/mois</div>}
          </div>
        ) : (
          <div style={{padding:14,background:'#fff7ed',border:'1px solid #fb923c',borderRadius:8,marginBottom:14,fontSize:13,color:'#c2410c'}}>
            ⚠ Aucun abonnement trouvé
          </div>
        )}

        <div style={{borderTop:`1px solid ${border}`,paddingTop:14,marginBottom:14}}>
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

        <div style={{borderTop:`1px solid ${border}`,paddingTop:14,marginBottom:14}}>
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

        <div style={{borderTop:`1px solid ${border}`,paddingTop:14,display:'flex',gap:8}}>
          {sub?.status === 'suspended' ? (
            <button onClick={reactivate} disabled={saving}
              style={{padding:'9px 18px',fontSize:13,fontWeight:600,background:'#16a34a',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontFamily:'inherit'}}>
              ▶ Réactiver
            </button>
          ) : (
            <button onClick={suspend} disabled={saving}
              style={{padding:'9px 18px',fontSize:13,fontWeight:600,background:'transparent',color:'#dc2626',border:'1px solid rgba(220,38,38,0.35)',borderRadius:6,cursor:'pointer',fontFamily:'inherit'}}>
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
