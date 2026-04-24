'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const inp: React.CSSProperties = { width:'100%', background:'#f0eeea', border:'1px solid rgba(0,0,0,0.14)', borderRadius:6, padding:'9px 12px', fontSize:13, color:'#1a1916', fontFamily:'inherit', outline:'none' }
const lbl: React.CSSProperties = { display:'block', fontSize:12, fontWeight:500, color:'#6b6860', marginBottom:5 }
const btnP: React.CSSProperties = { background:'#2563EB', color:'#fff', border:'none', borderRadius:6, padding:'9px 18px', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:6 }

const COLORS = [
  { name:'Bleu classique', val:'#2563EB' },
  { name:'Violet moderne', val:'#7c3aed' },
  { name:'Vert émeraude', val:'#0d9488' },
  { name:'Ambre corporate', val:'#d97706' },
  { name:'Rouge élégant', val:'#dc2626' },
  { name:'Noir minimaliste', val:'#1a1916' },
]

const FONTS = [
  { name:'Outfit', preview:'Moderne et clean' },
  { name:'Inter', preview:'Interface pro' },
  { name:'Poppins', preview:'Élégant' },
  { name:'Roboto', preview:'Classique' },
  { name:'Open Sans', preview:'Lisible' },
  { name:'Montserrat', preview:'Géométrique' },
  { name:'Lato', preview:'Sobre' },
  { name:'Raleway', preview:'Fin' },
]

export default function ParametresPage() {
  const [settings, setSettings] = useState<any>({})
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState('entreprise')
  const [uploadingLogo, setUploadingLogo] = useState(false)

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (!u) return
    const parsed = JSON.parse(u)
    setUser(parsed)
    fetch(parsed.company_id)
  }, [])

  async function fetch(companyId: string) {
    setLoading(true)
    const { data } = await supabase.from('settings').select('*').eq('company_id', companyId).maybeSingle()
const { data: comp } = await supabase.from('companies').select('slug').eq('id', companyId).maybeSingle()
if (data) setSettings({ ...data, slug: comp?.slug || '' })
    
    else {
      // Créer settings si absent
      const { data: created } = await supabase.from('settings').insert({
        company_id: companyId,
        primary_color: '#2563EB',
        currency: 'DZD',
        tva_rate: 19,
        font_family: 'Outfit',
        font_size_base: 14,
        font_size_pdf: 12,
      }).select().single()
      if (created) setSettings(created)
    }
    setLoading(false)
  }

  async function save() {
    if (!user?.company_id) { alert('Erreur: company_id manquant'); return }
    setSaving(true)
    const payload = {
      company_name: settings.company_name,
      email: settings.email,
      phone: settings.phone,
      address: settings.address,
      website: settings.website,
      tax_number: settings.tax_number,
      currency: settings.currency,
      tva_rate: settings.tva_rate,
      primary_color: settings.primary_color,
      footer_text: settings.footer_text,
      logo_url: settings.logo_url,
      font_family: settings.font_family,
      font_size_base: settings.font_size_base,
      font_size_pdf: settings.font_size_pdf,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('settings').update(payload).eq('company_id', user.company_id)
    if (error) {
      alert('Erreur: ' + error.message)
    } else {
      if (settings.font_family) document.body.style.fontFamily = `${settings.font_family}, sans-serif`
      if (settings.font_size_base) document.body.style.fontSize = `${settings.font_size_base}px`
      // Rafraîchir
      fetch(user.company_id)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user?.company_id) return
    if (file.size > 2 * 1024 * 1024) { alert('Max 2MB'); return }
    setUploadingLogo(true)
    const ext = file.name.split('.').pop()
    const fileName = `${user.company_id}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('logos').upload(fileName, file, { upsert: true })
    if (error) { alert('Erreur upload: ' + error.message); setUploadingLogo(false); return }
    const { data } = supabase.storage.from('logos').getPublicUrl(fileName)
    setSettings({ ...settings, logo_url: data.publicUrl })
    setUploadingLogo(false)
  }

  if (loading) return <div style={{textAlign:'center',padding:60,color:'#a8a69e'}}>Chargement...</div>

  const TABS = [
    { id:'entreprise', label:'Entreprise', icon:'🏢' },
    { id:'branding', label:'Logo & Apparence', icon:'🎨' },
    { id:'typographie', label:'Typographie', icon:'🔤' },
    { id:'facturation', label:'Facturation', icon:'💼' },
    { id:'systeme', label:'Système', icon:'⚙️' },
  ]

  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:17,fontWeight:600}}>Paramètres</div>
          <div style={{fontSize:12,color:'#a8a69e',marginTop:2}}>Configuration de votre entreprise</div>
        </div>
        <button style={btnP} onClick={save} disabled={saving}>
          {saved ? '✓ Enregistré' : saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'240px 1fr',gap:20,maxWidth:1200}}>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:8,position:'sticky',top:0,alignSelf:'start'}}>
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{width:'100%',padding:'11px 13px',borderRadius:6,border:'none',background:tab===t.id?'rgba(37,99,235,0.08)':'transparent',color:tab===t.id?'#2563EB':'#6b6860',fontSize:13,fontWeight:tab===t.id?600:500,cursor:'pointer',fontFamily:'inherit',textAlign:'left',display:'flex',alignItems:'center',gap:10,marginBottom:2}}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        <div>
          {tab === 'entreprise' && (
            <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:24}}>
              <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>Informations de l'entreprise</div>
              <div style={{fontSize:12,color:'#a8a69e',marginBottom:20}}>Apparaissent sur vos factures PDF</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={lbl}>Nom de l'entreprise *</label>
                  <div style={{gridColumn:'1/-1'}}>
  <label style={lbl}>Lien employés (slug URL)</label>
  <div style={{display:'flex',gap:8,alignItems:'center'}}>
    <span style={{fontSize:12,color:'#6b6860',whiteSpace:'nowrap'}}>rss.rscomptabilite.com/</span>
    <input style={inp} value={settings.slug || ''} onChange={e=>setSettings({...settings,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')})}/>
    <span style={{fontSize:12,color:'#6b6860',whiteSpace:'nowrap'}}>/login</span>
    <button onClick={async()=>{
      const { data } = await supabase.rpc('update_company_slug', { p_company_id: user.company_id, p_new_slug: settings.slug })
      if (data?.success) { alert('✓ Slug mis à jour'); setSettings({...settings, slug: data.slug}) }
      else alert('Erreur: ' + (data?.error || 'inconnue'))
    }} style={{padding:'9px 14px',fontSize:12,background:'#2563EB',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>Enregistrer slug</button>
  </div>
  {settings.slug && <div style={{fontSize:11,color:'#a8a69e',marginTop:6}}>🔗 Lien à partager : <code style={{background:'#f0eeea',padding:'2px 6px',borderRadius:3}}>rss.rscomptabilite.com/{settings.slug}/login</code></div>}
</div>
                  <input style={inp} value={settings.company_name||''} onChange={e=>setSettings({...settings,company_name:e.target.value})}/>
                </div>
                <div><label style={lbl}>Email</label><input type="email" style={inp} value={settings.email||''} onChange={e=>setSettings({...settings,email:e.target.value})}/></div>
                <div><label style={lbl}>Téléphone</label><input style={inp} value={settings.phone||''} onChange={e=>setSettings({...settings,phone:e.target.value})}/></div>
                <div style={{gridColumn:'1/-1'}}><label style={lbl}>Adresse</label><input style={inp} value={settings.address||''} onChange={e=>setSettings({...settings,address:e.target.value})}/></div>
                <div><label style={lbl}>Site web</label><input style={inp} value={settings.website||''} onChange={e=>setSettings({...settings,website:e.target.value})}/></div>
                <div><label style={lbl}>NIF / RC</label><input style={inp} value={settings.tax_number||''} onChange={e=>setSettings({...settings,tax_number:e.target.value})}/></div>
              </div>
            </div>
          )}

          {tab === 'branding' && (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:24}}>
                <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>Logo</div>
                <div style={{fontSize:12,color:'#a8a69e',marginBottom:20}}>Max 2MB · PNG/JPG</div>

                {settings.logo_url ? (
                  <div style={{display:'flex',alignItems:'center',gap:20,padding:20,background:'#f8f7f5',borderRadius:10}}>
                    <img src={settings.logo_url} alt="Logo" style={{width:100,height:100,objectFit:'contain',borderRadius:10,background:'#fff',padding:8}} />
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>Logo actuel</div>
                      <div style={{display:'flex',gap:8}}>
                        <label style={{...btnP,cursor:'pointer',padding:'7px 14px',fontSize:12}}>
                          {uploadingLogo?'Upload...':'Changer'}
                          <input type="file" accept="image/*" onChange={uploadLogo} disabled={uploadingLogo} style={{display:'none'}}/>
                        </label>
                        <button onClick={()=>setSettings({...settings,logo_url:null})} style={{padding:'7px 14px',fontSize:12,borderRadius:6,border:'1px solid rgba(220,38,38,0.2)',background:'rgba(220,38,38,0.06)',color:'#dc2626',cursor:'pointer',fontFamily:'inherit'}}>Supprimer</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'40px 24px',background:'#f8f7f5',border:'2px dashed rgba(37,99,235,0.3)',borderRadius:10,cursor:'pointer'}}>
                    <div style={{fontSize:40,marginBottom:8}}>📁</div>
                    <div style={{fontSize:14,fontWeight:600,color:'#2563EB'}}>{uploadingLogo?'Upload...':'Uploader un logo'}</div>
                    <input type="file" accept="image/*" onChange={uploadLogo} disabled={uploadingLogo} style={{display:'none'}}/>
                  </label>
                )}
              </div>

              <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:24}}>
                <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>Couleur principale</div>
                <div style={{fontSize:12,color:'#a8a69e',marginBottom:20}}>Couleur des factures et éléments importants</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
                  {COLORS.map(c => (
                    <button key={c.val} onClick={()=>setSettings({...settings,primary_color:c.val})}
                      style={{padding:14,borderRadius:8,border:`2px solid ${settings.primary_color===c.val?c.val:'rgba(0,0,0,0.1)'}`,background:'#fff',cursor:'pointer',fontFamily:'inherit',textAlign:'left',display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:28,height:28,borderRadius:6,background:c.val}}/>
                      <div style={{fontSize:12,fontWeight:600}}>{c.name}</div>
                    </button>
                  ))}
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <input type="color" value={settings.primary_color||'#2563EB'} onChange={e=>setSettings({...settings,primary_color:e.target.value})} style={{width:48,height:40,borderRadius:6,cursor:'pointer'}}/>
                  <input type="text" style={{...inp,flex:1}} value={settings.primary_color||''} onChange={e=>setSettings({...settings,primary_color:e.target.value})}/>
                </div>
              </div>
            </div>
          )}

          {tab === 'typographie' && (
            <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:24}}>
              <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>Typographie</div>
              <div style={{fontSize:12,color:'#a8a69e',marginBottom:20}}>Police et taille du texte</div>

              <div style={{marginBottom:20}}>
                <label style={lbl}>Police</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
                  {FONTS.map(f => (
                    <button key={f.name} onClick={()=>setSettings({...settings,font_family:f.name})}
                      style={{padding:16,borderRadius:8,border:`2px solid ${settings.font_family===f.name?'#2563EB':'rgba(0,0,0,0.1)'}`,background:settings.font_family===f.name?'rgba(37,99,235,0.05)':'#fff',cursor:'pointer',fontFamily:`${f.name}, sans-serif`,textAlign:'left'}}>
                      <div style={{fontSize:16,fontWeight:600,marginBottom:4}}>{f.name}</div>
                      <div style={{fontSize:12,color:'#6b6860'}}>{f.preview}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                <div>
                  <label style={lbl}>Taille app (px)</label>
                  <input type="number" min="11" max="18" style={inp} value={settings.font_size_base||14} onChange={e=>setSettings({...settings,font_size_base:parseInt(e.target.value)})}/>
                </div>
                <div>
                  <label style={lbl}>Taille PDF (px)</label>
                  <input type="number" min="10" max="16" style={inp} value={settings.font_size_pdf||12} onChange={e=>setSettings({...settings,font_size_pdf:parseInt(e.target.value)})}/>
                </div>
              </div>
            </div>
          )}

          {tab === 'facturation' && (
            <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:24}}>
              <div style={{fontSize:15,fontWeight:600,marginBottom:20}}>Facturation</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div>
                  <label style={lbl}>Devise</label>
                  <select style={inp} value={settings.currency||'DZD'} onChange={e=>setSettings({...settings,currency:e.target.value})}>
                    <option value="DZD">DZD — Dinar Algérien</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="USD">USD — Dollar</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>TVA (%)</label>
                  <input type="number" style={inp} value={settings.tva_rate||19} onChange={e=>setSettings({...settings,tva_rate:parseFloat(e.target.value)})}/>
                </div>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={lbl}>Pied de page factures</label>
                  <textarea style={{...inp,minHeight:80}} value={settings.footer_text||''} onChange={e=>setSettings({...settings,footer_text:e.target.value})}/>
                </div>
              </div>
            </div>
          )}

          {tab === 'systeme' && (
            <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:24}}>
              <div style={{fontSize:15,fontWeight:600,marginBottom:20}}>Informations système</div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {[
                  { label:'Application', val:'RSS' },
                  { label:'Développé par', val:'RS Comptabilité' },
                  { label:'Version', val:'2.0.0' },
                  { label:'Domaine', val:'rss.rscomptabilite.com' },
                  { label:'Company ID', val:user?.company_id },
                  { label:'Copyright', val:'Tous droits réservés © 2026' },
                ].map((f,i) => (
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',background:'#f8f7f5',borderRadius:6,fontSize:13}}>
                    <span style={{color:'#6b6860'}}>{f.label}</span>
                    <span style={{fontWeight:600,fontFamily:'monospace',fontSize:11}}>{f.val}</span>
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