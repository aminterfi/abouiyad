'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function dzd(v: number) { return (v||0).toLocaleString('fr-DZ',{minimumFractionDigits:2})+' DZD' }

const inp: React.CSSProperties = { width:'100%', background:'#f0eeea', border:'1px solid rgba(0,0,0,0.14)', borderRadius:6, padding:'9px 12px', fontSize:13, color:'#1a1916', fontFamily:'Outfit,sans-serif', outline:'none' }
const lbl: React.CSSProperties = { display:'block', fontSize:12, fontWeight:500, color:'#6b6860', marginBottom:5 }
const btnP: React.CSSProperties = { background:'#2563EB', color:'#fff', border:'none', borderRadius:6, padding:'9px 18px', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'Outfit,sans-serif', display:'inline-flex', alignItems:'center', gap:6 }
const btnG: React.CSSProperties = { background:'transparent', color:'#6b6860', border:'1px solid rgba(0,0,0,0.14)', borderRadius:6, padding:'9px 18px', fontSize:13, cursor:'pointer', fontFamily:'Outfit,sans-serif' }
const btnSm: React.CSSProperties = { padding:'5px 10px', fontSize:12, borderRadius:5, cursor:'pointer', fontFamily:'Outfit,sans-serif' }

const WILAYAS = ['Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra','Béchar','Blida','Bouira','Tamanrasset','Tébessa','Tlemcen','Tiaret','Tizi Ouzou','Alger','Djelfa','Jijel','Sétif','Saïda','Skikda','Sidi Bel Abbès','Annaba','Guelma','Constantine','Médéa','Mostaganem','M\'Sila','Mascara','Ouargla','Oran','El Bayadh','Illizi','Bordj Bou Arréridj','Boumerdès','El Tarf','Tindouf','Tissemsilt','El Oued','Khenchela','Souk Ahras','Tipaza','Mila','Aïn Defla','Naâma','Aïn Témouchent','Ghardaïa','Relizane','Timimoun','Bordj Badji Mokhtar','Ouled Djellal','Béni Abbès','In Salah','In Guezzam','Touggourt','Djanet','El M\'Ghair','El Meniaa']

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [billsStats, setBillsStats] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [viewing, setViewing] = useState<any>(null)
  const [form, setForm] = useState({ full_name:'', email:'', phone:'', address:'', wilaya:'' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: c }, { data: b }] = await Promise.all([
      supabase.from('clients').select('*').eq('is_archived',false).order('created_at',{ascending:false}),
      supabase.from('bills').select('client_id,total_amount,paid_amount,status').eq('is_archived',false)
    ])
    setClients(c||[])
    // aggregate stats per client
    const stats: Record<string,any> = {}
    ;(b||[]).forEach(bill => {
      if (!stats[bill.client_id]) stats[bill.client_id] = { count:0, total:0, paid:0, unpaid:0 }
      stats[bill.client_id].count++
      stats[bill.client_id].total += bill.total_amount
      stats[bill.client_id].paid += bill.paid_amount
      if (bill.status !== 'payé') stats[bill.client_id].unpaid += (bill.total_amount - bill.paid_amount)
    })
    setBillsStats(stats)
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm({ full_name:'', email:'', phone:'', address:'', wilaya:'' })
    setError('')
    setShowForm(true)
  }

  function openEdit(c: any) {
    setEditing(c)
    setForm({
      full_name: c.full_name||'',
      email: c.email||'',
      phone: c.phone||'',
      address: c.address||'',
      wilaya: c.wilaya||''
    })
    setError('')
    setShowForm(true)
  }

  async function save() {
    setError('')
    if (!form.full_name.trim()) { setError('Le nom du client est obligatoire'); return }
    setSaving(true)
    const user = JSON.parse(localStorage.getItem('user')||'{}')
    try {
      if (editing) {
        await supabase.from('clients').update(form).eq('id', editing.id)
      } else {
        await supabase.from('clients').insert({ ...form, created_by: user.id })
      }
      setShowForm(false)
      fetchAll()
    } catch (e: any) {
      setError(e.message||'Erreur lors de l\'enregistrement')
    }
    setSaving(false)
  }

  async function archive(id: string) {
    if (!confirm('Archiver ce client ?')) return
    await supabase.from('clients').update({is_archived:true}).eq('id',id)
    fetchAll()
  }

  const filtered = clients.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.wilaya?.toLowerCase().includes(search.toLowerCase())
  )

  const totalCA = Object.values(billsStats).reduce((s: number, v: any) => s + v.paid, 0)
  const totalImpaye = Object.values(billsStats).reduce((s: number, v: any) => s + v.unpaid, 0)

  // ===== FULL SCREEN FORM =====
  if (showForm) {
    return (
      <div style={{minHeight:'100vh',background:'#f5f4f1',margin:-22,padding:0,fontFamily:'Outfit,sans-serif'}}>
        <div style={{background:'#1a1916',padding:'0 28px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:50}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <button onClick={()=>setShowForm(false)} style={{background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',borderRadius:6,padding:'7px 14px',cursor:'pointer',fontFamily:'Outfit,sans-serif',fontSize:13,display:'flex',alignItems:'center',gap:6}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              Retour
            </button>
            <div style={{width:1,height:22,background:'rgba(255,255,255,0.15)'}}/>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:30,height:30,background:'#2563EB',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#fff'}}>
                {editing ? '✎' : '+'}
              </div>
              <div>
                <div style={{color:'#fff',fontSize:14,fontWeight:600}}>{editing ? 'Modifier le client' : 'Nouveau client'}</div>
                <div style={{color:'rgba(255,255,255,0.35)',fontSize:10}}>ABOU IYAD — RS Comptabilité</div>
              </div>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button style={btnG} onClick={()=>setShowForm(false)}>Annuler</button>
            <button style={btnP} onClick={save} disabled={saving}>
              {saving ? 'Enregistrement...' : (editing ? 'Mettre à jour' : 'Créer le client')}
            </button>
          </div>
        </div>

        <div style={{maxWidth:720,margin:'0 auto',padding:'32px 24px'}}>

          {error && (
            <div style={{background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'#dc2626',marginBottom:20,display:'flex',gap:10,alignItems:'center'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {/* IDENTITY */}
          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'20px 24px',marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:14}}>Identité du client</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lbl}>Nom complet / Raison sociale <span style={{color:'#dc2626'}}>*</span></label>
                <input autoFocus style={{...inp,fontSize:15,fontWeight:500}}
                  placeholder="Ex: Société Dupont SARL, Ahmed Benali..."
                  value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/>
              </div>
              <div>
                <label style={lbl}>Téléphone</label>
                <input style={inp} placeholder="0550 000 000"
                  value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
              </div>
              <div>
                <label style={lbl}>Email</label>
                <input type="email" style={inp} placeholder="contact@entreprise.dz"
                  value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
              </div>
            </div>
          </div>

          {/* LOCATION */}
          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'20px 24px',marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:14}}>Localisation</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div>
                <label style={lbl}>Wilaya</label>
                <select style={{...inp,appearance:'none'}} value={form.wilaya} onChange={e=>setForm({...form,wilaya:e.target.value})}>
                  <option value="">-- Sélectionner --</option>
                  {WILAYAS.map(w=><option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Adresse</label>
                <input style={inp} placeholder="Rue, cité, quartier..."
                  value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/>
              </div>
            </div>
          </div>

          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button style={btnG} onClick={()=>setShowForm(false)}>Annuler</button>
            <button style={btnP} onClick={save} disabled={saving}>
              {saving ? 'Enregistrement...' : (editing ? 'Mettre à jour' : 'Créer le client')}
            </button>
          </div>

          <div style={{textAlign:'center',marginTop:32,fontSize:11,color:'#c8c6be'}}>Développé par RS Comptabilité</div>
        </div>
      </div>
    )
  }

  // ===== DETAIL VIEW =====
  if (viewing) {
    const stats = billsStats[viewing.id] || { count:0, total:0, paid:0, unpaid:0 }
    return (
      <div style={{minHeight:'100vh',background:'#f5f4f1',margin:-22,padding:0,fontFamily:'Outfit,sans-serif'}}>
        <div style={{background:'#1a1916',padding:'0 28px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <button onClick={()=>setViewing(null)} style={{background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',borderRadius:6,padding:'7px 14px',cursor:'pointer',fontFamily:'Outfit,sans-serif',fontSize:13,display:'flex',alignItems:'center',gap:6}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              Retour
            </button>
            <div style={{width:1,height:22,background:'rgba(255,255,255,0.15)'}}/>
            <div>
              <div style={{color:'#fff',fontSize:14,fontWeight:600}}>{viewing.full_name}</div>
              <div style={{color:'rgba(255,255,255,0.35)',fontSize:10}}>Fiche client détaillée</div>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button style={btnG} onClick={()=>{ setViewing(null); openEdit(viewing) }}>Modifier</button>
            <button style={{...btnG,color:'#ff8888',borderColor:'rgba(255,136,136,0.3)'}} onClick={()=>{ archive(viewing.id); setViewing(null) }}>Archiver</button>
          </div>
        </div>

        <div style={{maxWidth:900,margin:'0 auto',padding:'28px 24px'}}>
          {/* HEADER CARD */}
          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:12,padding:'24px',marginBottom:16,display:'flex',alignItems:'center',gap:20}}>
            <div style={{width:72,height:72,borderRadius:'50%',background:'linear-gradient(135deg,#2563EB,#7c3aed)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:700,flexShrink:0}}>
              {viewing.full_name?.split(' ').map((w:string)=>w[0]).slice(0,2).join('')}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:20,fontWeight:700,color:'#1a1916'}}>{viewing.full_name}</div>
              <div style={{fontSize:13,color:'#6b6860',marginTop:3,display:'flex',gap:16,flexWrap:'wrap'}}>
                {viewing.email && <span>✉ {viewing.email}</span>}
                {viewing.phone && <span>☎ {viewing.phone}</span>}
                {viewing.wilaya && <span>📍 {viewing.wilaya}</span>}
              </div>
            </div>
          </div>

          {/* STATS */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
            {[
              { label:'Factures', val:stats.count, color:'#2563EB' },
              { label:'CA total', val:dzd(stats.total), color:'#1a1916', mono:true },
              { label:'Encaissé', val:dzd(stats.paid), color:'#16a34a', mono:true },
              { label:'Impayés', val:dzd(stats.unpaid), color:'#d97706', mono:true },
            ].map((s,i)=>(
              <div key={i} style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'16px'}}>
                <div style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:6}}>{s.label}</div>
                <div style={{fontSize:18,fontWeight:700,color:s.color,fontFamily:s.mono?'JetBrains Mono,monospace':'Outfit,sans-serif'}}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* INFO */}
          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'20px 24px'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:14}}>Informations détaillées</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
              {[
                { label:'Nom complet', val:viewing.full_name },
                { label:'Email', val:viewing.email||'—' },
                { label:'Téléphone', val:viewing.phone||'—' },
                { label:'Wilaya', val:viewing.wilaya||'—' },
                { label:'Adresse', val:viewing.address||'—' },
                { label:'Créé le', val:new Date(viewing.created_at).toLocaleDateString('fr-DZ',{dateStyle:'full'}) },
              ].map((f,i)=>(
                <div key={i}>
                  <div style={{fontSize:11,color:'#a8a69e',fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px',marginBottom:4}}>{f.label}</div>
                  <div style={{fontSize:14,fontWeight:500,color:'#1a1916'}}>{f.val}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{textAlign:'center',marginTop:32,fontSize:11,color:'#c8c6be'}}>Développé par RS Comptabilité</div>
        </div>
      </div>
    )
  }

  // ===== LIST VIEW =====
  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:17,fontWeight:600,letterSpacing:'-.3px'}}>Clients</div>
          <div style={{fontSize:12,color:'#a8a69e',marginTop:2}}>{clients.length} client(s) actif(s)</div>
        </div>
        <button style={btnP} onClick={openNew}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouveau client
        </button>
      </div>

      {/* STATS */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'14px 18px'}}>
          <div style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:6}}>Total clients</div>
          <div style={{fontSize:20,fontWeight:700}}>{clients.length}</div>
        </div>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'14px 18px'}}>
          <div style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:6}}>CA encaissé</div>
          <div style={{fontSize:20,fontWeight:700,color:'#16a34a',fontFamily:'JetBrains Mono,monospace'}}>{dzd(totalCA)}</div>
        </div>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'14px 18px'}}>
          <div style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:6}}>Impayés</div>
          <div style={{fontSize:20,fontWeight:700,color:'#d97706',fontFamily:'JetBrains Mono,monospace'}}>{dzd(totalImpaye)}</div>
        </div>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'14px 18px'}}>
          <div style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:6}}>Avec factures</div>
          <div style={{fontSize:20,fontWeight:700}}>{Object.keys(billsStats).length}</div>
        </div>
      </div>

      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:7,background:'#fff',border:'1px solid rgba(0,0,0,0.14)',borderRadius:5,padding:'7px 11px',flex:1,minWidth:200,maxWidth:360}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a8a69e" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input style={{background:'none',border:'none',outline:'none',color:'#1a1916',fontSize:13,fontFamily:'Outfit,sans-serif',width:'100%'}}
            placeholder="Rechercher par nom, email, téléphone, wilaya..." value={search} onChange={e=>setSearch(e.target.value)}/>
          {search && <button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'#a8a69e',fontSize:16}}>×</button>}
        </div>
      </div>

      <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
            <thead>
              <tr>{['Client','Contact','Wilaya','Factures','CA / Solde','Actions'].map(h=>(
                <th key={h} style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px',padding:'9px 14px',borderBottom:'1px solid rgba(0,0,0,0.08)',textAlign:'left',whiteSpace:'nowrap',background:'#f0eeea'}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'#a8a69e'}}>Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'#a8a69e'}}>Aucun client trouvé</td></tr>
              ) : filtered.map(c => {
                const stats = billsStats[c.id] || { count:0, total:0, paid:0, unpaid:0 }
                return (
                  <tr key={c.id} style={{borderBottom:'1px solid rgba(0,0,0,0.05)',cursor:'pointer'}} onClick={()=>setViewing(c)}>
                    <td style={{padding:'12px 14px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:34,height:34,borderRadius:'50%',background:'rgba(37,99,235,0.1)',color:'#2563EB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0}}>
                          {c.full_name?.split(' ').map((w:string)=>w[0]).slice(0,2).join('')}
                        </div>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:'#1a1916'}}>{c.full_name}</div>
                          <div style={{fontSize:11,color:'#a8a69e',marginTop:1}}>Ajouté {new Date(c.created_at).toLocaleDateString('fr-DZ')}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{padding:'12px 14px',fontSize:12}}>
                      {c.email && <div style={{color:'#6b6860'}}>{c.email}</div>}
                      {c.phone && <div style={{color:'#a8a69e',marginTop:2}}>{c.phone}</div>}
                      {!c.email && !c.phone && <span style={{color:'#a8a69e'}}>—</span>}
                    </td>
                    <td style={{padding:'12px 14px',fontSize:12,color:'#6b6860'}}>{c.wilaya||'—'}</td>
                    <td style={{padding:'12px 14px'}}>
                      <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(37,99,235,0.08)',color:'#2563EB',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600}}>
                        {stats.count} facture{stats.count>1?'s':''}
                      </div>
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'#16a34a',fontWeight:600}}>{dzd(stats.paid)}</div>
                      {stats.unpaid > 0 && <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'#d97706',marginTop:2}}>Solde: {dzd(stats.unpaid)}</div>}
                    </td>
                    <td style={{padding:'12px 14px'}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:'flex',gap:5}}>
                        <button style={{...btnSm,background:'transparent',color:'#2563EB',border:'1px solid rgba(37,99,235,0.2)'}} onClick={()=>setViewing(c)}>Voir</button>
                        <button style={{...btnSm,background:'transparent',color:'#6b6860',border:'1px solid rgba(0,0,0,0.14)'}} onClick={()=>openEdit(c)}>Modifier</button>
                        <button style={{...btnSm,background:'rgba(220,38,38,0.08)',color:'#dc2626',border:'1px solid rgba(220,38,38,0.15)'}} onClick={()=>archive(c.id)}>Archiver</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}