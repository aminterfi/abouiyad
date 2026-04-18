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
  { name:'Inter', preview:'Interface professionnelle' },
  { name:'Poppins', preview:'Élégant et arrondi' },
  { name:'Roboto', preview:'Classique Google' },
  { name:'Open Sans', preview:'Lisible et neutre' },
  { name:'Montserrat', preview:'Géométrique élégant' },
  { name:'Lato', preview:'Sobre et chaleureux' },
  { name:'Raleway', preview:'Fin et moderne' },
]

export default function ParametresPage() {
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState('entreprise')
  const [uploadingLogo, setUploadingLogo] = useState(false)

  useEffect(() => { fetch() }, [])

  async function fetch() {
    const { data } = await supabase.from('settings').select('*').single()
    if (data) setSettings(data)
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('settings').update({
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
    }).eq('id', settings.id)
    if (!error) {
      // Appliquer immédiatement les changements
      if (settings.font_family) document.body.style.fontFamily = `${settings.font_family}, sans-serif`
      if (settings.font_size_base) document.body.style.fontSize = `${settings.font_size_base}px`
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('Fichier trop grand (max 2MB)'); return }
    setUploadingLogo(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `logo-${Date.now()}.${fileExt}`
    const { error } = await supabase.storage.from('logos').upload(fileName, file, { upsert: true })
    if (error) { alert('Erreur upload: ' + error.message); setUploadingLogo(false); return }
    const { data } = supabase.storage.from('logos').getPublicUrl(fileName)
    setSettings({ ...settings, logo_url: data.publicUrl })
    setUploadingLogo(false)
  }

  async function removeLogo() {
    if (!confirm('Supprimer le logo ?')) return
    setSettings({ ...settings, logo_url: null })
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
          <div style={{fontSize:17,fontWeight:600,letterSpacing:'-.3px'}}>Paramètres</div>
          <div style={{fontSize:12,color:'#a8a69e',marginTop:2}}>Configuration de l'entreprise, apparence et facturation</div>
        </div>
        <button style={btnP} onClick={save} disabled={saving}>
          {saved ? (<><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Enregistré</>) : saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'240px 1fr',gap:20,maxWidth:1200}}>
        <div>
          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:8,position:'sticky',top:0}}>
            {TABS.map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{width:'100%',padding:'11px 13px',borderRadius:6,border:'none',background:tab===t.id?'rgba(37,99,235,0.08)':'transparent',color:tab===t.id?'#2563EB':'#6b6860',fontSize:13,fontWeight:tab===t.id?600:500,cursor:'pointer',fontFamily:'inherit',textAlign:'left',display:'flex',alignItems:'center',gap:10,marginBottom:2}}>
                <span style={{fontSize:16}}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          {tab === 'entreprise' && (
            <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:24}}>
              <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>Informations de l'entreprise</div>
              <div style={{fontSize:12,color:'#a8a69e',marginBottom:20}}>Ces informations apparaîtront sur vos factures PDF et reçus</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={lbl}>Nom de l'entreprise *</label>
                  <input style={{...inp,fontSize:15,fontWeight:500}} value={settings.company_name||''} onChange={e=>setSettings({...settings,company_name:e.target.value})}/>
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
                <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>Logo de l'entreprise</div>
                <div style={{fontSize:12,color:'#a8a69e',marginBottom:20}}>Votre logo apparaîtra sur les factures PDF et dans la sidebar (max 2MB, PNG/JPG)</div>

                {settings.logo_url ? (
                  <div style={{display:'flex',alignItems:'center',gap:20,padding:20,background:'#f8f7f5',borderRadius:10,border:'1px solid rgba(0,0,0,0.06)'}}>
                    <img src={settings.logo_url} alt="Logo actuel" style={{width:100,height:100,objectFit:'contain',borderRadius:10,background:'#fff',border:'1px solid rgba(0,0,0,0.08)',padding:8}} />
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Logo actuel</div>
                      <div style={{fontSize:11,color:'#a8a69e',marginBottom:12,wordBreak:'break-all'}}>{settings.logo_url.split('/').pop()}</div>
                      <div style={{display:'flex',gap:8}}>
                        <label style={{...btnP,cursor:'pointer',padding:'7px 14px',fontSize:12}}>
                          {uploadingLogo?'Upload...':'Changer'}
                          <input type="file" accept="image/*" onChange={uploadLogo} disabled={uploadingLogo} style={{display:'none'}}/>
                        </label>
                        <button onClick={removeLogo} style={{padding:'7px 14px',fontSize:12,borderRadius:6,border:'1px solid rgba(220,38,38,0.2)',background:'rgba(220,38,38,0.06)',color:'#dc2626',cursor:'pointer',fontFamily:'inherit'}}>Supprimer</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 24px',background:'#f8f7f5',border:'2px dashed rgba(37,99,235,0.3)',borderRadius:10,cursor:'pointer',transition:'all .15s'}}>
                    <div style={{fontSize:40,marginBottom:8}}>📁</div>
                    <div style={{fontSize:14,fontWeight:600,color:'#2563EB',marginBottom:4}}>{uploadingLogo?'Upload en cours...':'Cliquer pour uploader un logo'}</div>
                    <div style={{fontSize:11,color:'#a8a69e'}}>PNG, JPG, SVG · max 2MB</div>
                    <input type="file" accept="image/*" onChange={uploadLogo} disabled={uploadingLogo} style={{display:'none'}}/>
                  </label>
                )}
              </div>

              <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:24}}>
                <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>Couleur principale</div>
                <div style={{fontSize:12,color:'#a8a69e',marginBottom:20}}>Couleur utilisée sur les factures PDF et les éléments importants</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
                  {COLORS.map(c => (
                    <button key={c.val} onClick={()=>setSettings({...settings,primary_color:c.val})}
                      style={{padding:14,borderRadius:8,border:`2px solid ${settings.primary_color===c.val?c.val:'rgba(0,0,0,0.1)'}`,background:'#fff',cursor:'pointer',fontFamily:'inherit',textAlign:'left',display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:28,height:28,borderRadius:6,background:c.val,flexShrink:0}}/>
                      <div>
                        <div style={{fontSize:12,fontWeight:600}}>{c.name}</div>
                        <div style={{fontSize:11,color:'#a8a69e',fontFamily:'JetBrains Mono,monospace'}}>{c.val}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div>
                  <label style={lbl}>Ou couleur personnalisée</label>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <input type="color" value={settings.primary_color||'#2563EB'} onChange={e=>setSettings({...settings,primary_color:e.target.value})} style={{width:48,height:40,borderRadius:6,border:'1px solid rgba(0,0,0,0.14)',cursor:'pointer'}}/>
                    <input type="text" style={{...inp,flex:1,fontFamily:'JetBrains Mono,monospace'}} value={settings.primary_color||''} onChange={e=>setSettings({...settings,primary_color:e.target.value})}/>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'typographie' && (
            <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:24}}>
              <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>Typographie</div>
              <div style={{fontSize:12,color:'#a8a69e',marginBottom:20}}>Police et taille du texte pour l'app et les PDFs</div>

              <div style={{marginBottom:24}}>
                <label style={lbl}>Police principale</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginTop:8}}>
                  {FONTS.map(f => (
                    <button key={f.name} onClick={()=>setSettings({...settings,font_family:f.name})}
                      style={{padding:16,borderRadius:8,border:`2px solid ${settings.font_family===f.name?'#2563EB':'rgba(0,0,0,0.1)'}`,background:settings.font_family===f.name?'rgba(37,99,235,0.05)':'#fff',cursor:'pointer',fontFamily:`${f.name}, sans-serif`,textAlign:'left'}}>
                      <div style={{fontSize:16,fontWeight:600,marginBottom:4}}>{f.name}</div>
                      <div style={{fontSize:12,color:'#6b6860'}}>{f.preview}</div>
                      <div style={{fontSize:10,color:'#a8a69e',marginTop:6,fontStyle:'italic'}}>The quick brown fox 123</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                <div>
                  <label style={lbl}>Taille texte app (px)</label>
                  <input type="number" min="11" max="18" style={inp} value={settings.font_size_base||14} onChange={e=>setSettings({...settings,font_size_base:parseInt(e.target.value)})}/>
                  <div style={{fontSize:11,color:'#a8a69e',marginTop:4}}>Entre 11 et 18 px (défaut: 14)</div>
                </div>
                <div>
                  <label style={lbl}>Taille texte PDF (px)</label>
                  <input type="number" min="10" max="16" style={inp} value={settings.font_size_pdf||12} onChange={e=>setSettings({...settings,font_size_pdf:parseInt(e.target.value)})}/>
                  <div style={{fontSize:11,color:'#a8a69e',marginTop:4}}>Entre 10 et 16 px (défaut: 12)</div>
                </div>
              </div>

              <div style={{background:'#f8f7f5',border:'1px solid rgba(0,0,0,0.06)',borderRadius:8,padding:20,marginTop:20}}>
                <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:10}}>Aperçu</div>
                <div style={{fontFamily:`${settings.font_family||'Outfit'}, sans-serif`,fontSize:settings.font_size_base||14}}>
                  <div style={{fontSize:(settings.font_size_base||14)+4,fontWeight:700,marginBottom:6}}>{settings.company_name||'ABOU IYAD'}</div>
                  <div style={{color:'#6b6860'}}>Ceci est un aperçu de la police "{settings.font_family||'Outfit'}" à {settings.font_size_base||14}px. Les changements s'appliqueront partout après enregistrement.</div>
                </div>
              </div>

              <link href={`https://fonts.googleapis.com/css2?family=${(settings.font_family||'Outfit').replace(/ /g,'+')}:wght@400;500;600;700&display=swap`} rel="stylesheet" />
            </div>
          )}

          {tab === 'facturation' && (
            <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:24}}>
              <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>Paramètres de facturation</div>
              <div style={{fontSize:12,color:'#a8a69e',marginBottom:20}}>Devise, TVA et conditions</div>
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
                  <textarea style={{...inp,resize:'vertical',minHeight:80}} rows={3} placeholder="Ex: Paiement par virement sous 15 jours..."
                    value={settings.footer_text||''} onChange={e=>setSettings({...settings,footer_text:e.target.value})}/>
                </div>
              </div>
            </div>
          )}

          {tab === 'systeme' && (
            <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:24}}>
              <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>Informations système</div>
              <div style={{fontSize:12,color:'#a8a69e',marginBottom:20}}>Détails techniques</div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {[
                  { label:'Nom de l\'application', val:'ABOU IYAD' },
                  { label:'Développé par', val:'RS Comptabilité' },
                  { label:'Version', val:'1.0.0' },
                  { label:'Base de données', val:'Supabase PostgreSQL' },
                  { label:'Framework', val:'Next.js 16 + TypeScript' },
                  { label:'Hébergement', val:'Vercel' },
                  { label:'Domaine', val:'abouiyad.rscomptabilite.com' },
                  { label:'Localisation', val:'Algérie (DZD)' },
                ].map((f,i) => (
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