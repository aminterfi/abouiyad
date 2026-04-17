'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const inp: React.CSSProperties = { width:'100%', background:'#f0eeea', border:'1px solid rgba(0,0,0,0.14)', borderRadius:6, padding:'9px 12px', fontSize:13, color:'#1a1916', fontFamily:'Outfit,sans-serif', outline:'none' }
const lbl: React.CSSProperties = { display:'block', fontSize:12, fontWeight:500, color:'#6b6860', marginBottom:5 }
const btnP: React.CSSProperties = { background:'#2563EB', color:'#fff', border:'none', borderRadius:6, padding:'9px 18px', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'Outfit,sans-serif', display:'inline-flex', alignItems:'center', gap:6 }

const COLORS = [
  { name:'Bleu classique', val:'#2563EB' },
  { name:'Violet moderne', val:'#7c3aed' },
  { name:'Vert émeraude', val:'#0d9488' },
  { name:'Ambre corporate', val:'#d97706' },
  { name:'Rouge élégant', val:'#dc2626' },
  { name:'Noir minimaliste', val:'#1a1916' },
]

export default function ParametresPage() {
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState('entreprise')

  useEffect(() => { fetch() }, [])

  async function fetch() {
    const { data } = await supabase.from('settings').select('*').single()
    if (data) setSettings(data)
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    await supabase.from('settings').update(settings).eq('id', settings.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <div style={{textAlign:'center',padding:60,color:'#a8a69e'}}>Chargement...</div>

  const TABS = [
    { id:'entreprise', label:'Entreprise', icon:'🏢' },
    { id:'facturation', label:'Facturation', icon:'💼' },
    { id:'branding', label:'Apparence', icon:'🎨' },
    { id:'systeme', label:'Système', icon:'⚙️' },
  ]

  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:17,fontWeight:600,letterSpacing:'-.3px'}}>Paramètres</div>
          <div style={{fontSize:12,color:'#a8a69e',marginTop:2}}>Configuration de l'entreprise et du système</div>
        </div>
        <button style={btnP} onClick={save} disabled={saving}>
          {saved ? (<><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Enregistré !</>) : saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'220px 1fr',gap:20,maxWidth:1100}}>

        {/* TABS SIDEBAR */}
        <div>
          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:8}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{width:'100%',padding:'10px 12px',borderRadius:6,border:'none',background:tab===t.id?'rgba(37,99,235,0.08)':'transparent',color:tab===t.id?'#2563EB':'#6b6860',fontSize:13,fontWeight:tab===t.id?600:500,cursor:'pointer',fontFamily:'Outfit,sans-serif',textAlign:'left',display:'flex',alignItems:'center',gap:10,marginBottom:2}}>
                <span style={{fontSize:16}}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div>
          {tab === 'entreprise' && (
            <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'24px'}}>
              <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>Informations de l'entreprise</div>
              <div style={{fontSize:12,color:'#a8a69e',marginBottom:20}}>Ces informations apparaîtront sur vos factures et reçus</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={lbl}>Nom de l'entreprise</label>
                  <input style={{...inp,fontSize:15,fontWeight:500}} value={settings.company_name||''} onChange={e=>setSettings({...settings,company_name:e.target.value})}/>
                </div>
                <div><label style={lbl}>Email de contact</label><input type="email" style={inp} value={settings.email||''} onChange={e=>setSettings({...settings,email:e.target.value})}/></div>
                <div><label style={lbl}>Téléphone</label><input style={inp} value={settings.phone||''} onChange={e=>setSettings({...settings,phone:e.target.value})}/></div>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={lbl}>Adresse complète</label>
                  <input style={inp} value={settings.address||''} onChange={e=>setSettings({...settings,address:e.target.value})}/>
                </div>
                <div><label style={lbl}>Site web</label><input style={inp} value={settings.website||''} onChange={e=>setSettings({...settings,website:e.target.value})}/></div>
                <div><label style={lbl}>NIF / RC</label><input style={inp} value={settings.tax_number||''} onChange={e=>setSettings({...settings,tax_number:e.target.value})}/></div>
              </div>
            </div>
          )}

          {tab === 'facturation' && (
            <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'24px'}}>
              <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>Paramètres de facturation</div>
              <div style={{fontSize:12,color:'#a8a69e',marginBottom:20}}>Devise, TVA et format des factures</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div>
                  <label style={lbl}>Devise</label>
                  <select style={{...inp,appearance:'none'}} value={settings.currency||'DZD'} onChange={e=>setSettings({...settings,currency:e.target.value})}>
                    <option value="DZD">DZD — Dinar Algérien</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="USD">USD — Dollar</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Taux de TVA (%)</label>
                  <input type="number" style={inp} value={settings.tva_rate||19} onChange={e=>setSettings({...settings,tva_rate:parseFloat(e.target.value)})}/>
                </div>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={lbl}>Pied de page des factures</label>
                  <textarea style={{...inp,resize:'vertical',minHeight:80}} rows={3} placeholder="Ex: Paiement par virement sous 15 jours. RIB: ..."
                    value={settings.footer_text||''} onChange={e=>setSettings({...settings,footer_text:e.target.value})}/>
                </div>
              </div>
            </div>
          )}

          {tab === 'branding' && (
            <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'24px'}}>
              <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>Apparence</div>
              <div style={{fontSize:12,color:'#a8a69e',marginBottom:20}}>Couleur principale de la marque</div>
              <label style={lbl}>Couleur principale</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginTop:8}}>
                {COLORS.map(c=>(
                  <button key={c.val} onClick={()=>setSettings({...settings,primary_color:c.val})}
                    style={{padding:'14px',borderRadius:8,border:`2px solid ${settings.primary_color===c.val?c.val:'rgba(0,0,0,0.1)'}`,background:'#fff',cursor:'pointer',fontFamily:'Outfit,sans-serif',textAlign:'left',display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:28,height:28,borderRadius:6,background:c.val,flexShrink:0}}/>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:'#1a1916'}}>{c.name}</div>
                      <div style={{fontSize:11,color:'#a8a69e',fontFamily:'JetBrains Mono,monospace'}}>{c.val}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'systeme' && (
            <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'24px'}}>
              <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>Informations système</div>
              <div style={{fontSize:12,color:'#a8a69e',marginBottom:20}}>Détails techniques de votre application</div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {[
                  { label:'Nom de l\'application', val:'ABOU IYAD' },
                  { label:'Développé par', val:'RS Comptabilité' },
                  { label:'Version', val:'1.0.0' },
                  { label:'Base de données', val:'Supabase PostgreSQL' },
                  { label:'Framework', val:'Next.js 15 + TypeScript' },
                  { label:'Localisation', val:'Algérie (DZD)' },
                ].map((f,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',background:'#f8f7f5',borderRadius:6,fontSize:13}}>
                    <span style={{color:'#6b6860'}}>{f.label}</span>
                    <span style={{fontWeight:600,color:'#1a1916'}}>{f.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}