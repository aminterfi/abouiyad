'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function dzd(v: number) { return (v||0).toLocaleString('fr-DZ',{minimumFractionDigits:2})+' DZD' }

const inp: React.CSSProperties = { width:'100%', background:'#f0eeea', border:'1px solid rgba(0,0,0,0.14)', borderRadius:6, padding:'9px 12px', fontSize:13, color:'#1a1916', fontFamily:'Outfit,sans-serif', outline:'none' }
const lbl: React.CSSProperties = { display:'block', fontSize:12, fontWeight:500, color:'#6b6860', marginBottom:5 }
const btnP: React.CSSProperties = { background:'#2563EB', color:'#fff', border:'none', borderRadius:6, padding:'9px 18px', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'Outfit,sans-serif', display:'inline-flex', alignItems:'center', gap:6 }
const btnG: React.CSSProperties = { background:'transparent', color:'#6b6860', border:'1px solid rgba(0,0,0,0.14)', borderRadius:6, padding:'9px 18px', fontSize:13, cursor:'pointer', fontFamily:'Outfit,sans-serif' }
const btnSm: React.CSSProperties = { padding:'5px 10px', fontSize:12, borderRadius:5, cursor:'pointer', fontFamily:'Outfit,sans-serif' }

const CATEGORIES = ['Service', 'Produit', 'Abonnement', 'Consultation', 'Formation', 'Maintenance']

export default function ProduitsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [billItems, setBillItems] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('tous')
  const [availFilter, setAvailFilter] = useState('tous')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ name:'', price:'', category:'Service', description:'', is_available:true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const user = JSON.parse(localStorage.getItem('user')||'{}')
    if (!user.company_id) return
    const [{ data: p }, { data: items }] = await Promise.all([
      supabase.from('products').select('*').eq('company_id', user.company_id).eq('is_archived',false).order('created_at',{ascending:false}),
      supabase.from('bill_items').select('product_id,quantity,total').eq('company_id', user.company_id)
    ])
    setProducts(p||[])
    const stats: Record<string,any> = {}
    ;(items||[]).forEach(i => {
      if (!i.product_id) return
      if (!stats[i.product_id]) stats[i.product_id] = { count:0, qty:0, total:0 }
      stats[i.product_id].count++
      stats[i.product_id].qty += i.quantity
      stats[i.product_id].total += i.total
    })
    setBillItems(stats)
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm({ name:'', price:'', category:'Service', description:'', is_available:true })
    setError('')
    setShowForm(true)
  }

  function openEdit(p: any) {
    setEditing(p)
    setForm({
      name: p.name||'',
      price: p.price?.toString()||'',
      category: p.category||'Service',
      description: p.description||'',
      is_available: p.is_available
    })
    setError('')
    setShowForm(true)
  }

  async function save() {
    setError('')
    if (!form.name.trim()) { setError('La désignation est obligatoire'); return }
    if (!form.price || parseFloat(form.price) <= 0) { setError('Le prix doit être supérieur à 0'); return }
    setSaving(true)
    const user = JSON.parse(localStorage.getItem('user')||'{}')
    try {
      const data = {
        name: form.name,
        price: parseFloat(form.price),
        category: form.category,
        description: form.description,
        is_available: form.is_available,
      }
      if (editing) {
        await supabase.from('products').update(data).eq('id', editing.id)
      } else {
        await supabase.from('products').insert({ ...data, created_by: user.id, company_id: user.company_id })
      }
      setShowForm(false)
      fetchAll()
    } catch (e: any) {
      setError(e.message||'Erreur lors de l\'enregistrement')
    }
    setSaving(false)
  }

  async function toggleAvailability(id: string, current: boolean) {
    await supabase.from('products').update({ is_available: !current }).eq('id', id)
    fetchAll()
  }

  async function archive(id: string) {
    if (!confirm('Archiver ce produit ?')) return
    await supabase.from('products').update({is_archived:true}).eq('id',id)
    fetchAll()
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === 'tous' || p.category === catFilter
    const matchAvail = availFilter === 'tous' || (availFilter === 'dispo' ? p.is_available : !p.is_available)
    return matchSearch && matchCat && matchAvail
  })

  const totalValue = products.reduce((s,p) => s + (p.price || 0), 0)
  const avgPrice = products.length ? totalValue / products.length : 0
  const topProduct = Object.entries(billItems).sort((a:any,b:any) => b[1].total - a[1].total)[0]
  const topProductData = topProduct ? products.find(p => p.id === topProduct[0]) : null

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
              <div style={{width:30,height:30,background:'#2563EB',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#fff'}}>{editing?'✎':'+'}</div>
              <div>
                <div style={{color:'#fff',fontSize:14,fontWeight:600}}>{editing?'Modifier le produit':'Nouveau produit / service'}</div>
                <div style={{color:'rgba(255,255,255,0.35)',fontSize:10}}>ABOU IYAD — RS Comptabilité</div>
              </div>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button style={btnG} onClick={()=>setShowForm(false)}>Annuler</button>
            <button style={btnP} onClick={save} disabled={saving}>
              {saving?'Enregistrement...':(editing?'Mettre à jour':'Créer')}
            </button>
          </div>
        </div>

        <div style={{maxWidth:720,margin:'0 auto',padding:'32px 24px'}}>
          {error && (
            <div style={{background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'#dc2626',marginBottom:20}}>{error}</div>
          )}

          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'20px 24px',marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:14}}>Informations produit</div>
            <div style={{marginBottom:14}}>
              <label style={lbl}>Désignation <span style={{color:'#dc2626'}}>*</span></label>
              <input autoFocus style={{...inp,fontSize:15,fontWeight:500}}
                placeholder="Ex: Comptabilité mensuelle, Audit annuel..."
                value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div>
                <label style={lbl}>Prix HT (DZD) <span style={{color:'#dc2626'}}>*</span></label>
                <div style={{position:'relative'}}>
                  <input type="number" min="0" step="0.01" style={{...inp,paddingRight:50,fontSize:15,fontWeight:600}}
                    placeholder="0" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/>
                  <div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'#a8a69e',fontWeight:600}}>DZD</div>
                </div>
              </div>
              <div>
                <label style={lbl}>Catégorie</label>
                <select style={{...inp,appearance:'none'}} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                  {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{marginTop:14}}>
              <label style={lbl}>Description</label>
              <textarea style={{...inp,resize:'vertical',minHeight:70}} rows={3}
                placeholder="Description courte du produit ou service..."
                value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
            </div>
          </div>

          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'20px 24px',marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:14}}>Disponibilité</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <button onClick={()=>setForm({...form,is_available:true})}
                style={{padding:'14px',borderRadius:8,border:`2px solid ${form.is_available?'#16a34a':'rgba(0,0,0,0.1)'}`,background:form.is_available?'rgba(22,163,74,0.06)':'#fff',cursor:'pointer',fontFamily:'Outfit,sans-serif',textAlign:'left'}}>
                <div style={{fontSize:20,marginBottom:4}}>✓</div>
                <div style={{fontSize:13,fontWeight:600,color:form.is_available?'#16a34a':'#6b6860'}}>Disponible</div>
                <div style={{fontSize:11,color:'#a8a69e',marginTop:2}}>Peut être facturé</div>
              </button>
              <button onClick={()=>setForm({...form,is_available:false})}
                style={{padding:'14px',borderRadius:8,border:`2px solid ${!form.is_available?'#dc2626':'rgba(0,0,0,0.1)'}`,background:!form.is_available?'rgba(220,38,38,0.06)':'#fff',cursor:'pointer',fontFamily:'Outfit,sans-serif',textAlign:'left'}}>
                <div style={{fontSize:20,marginBottom:4}}>✕</div>
                <div style={{fontSize:13,fontWeight:600,color:!form.is_available?'#dc2626':'#6b6860'}}>Indisponible</div>
                <div style={{fontSize:11,color:'#a8a69e',marginTop:2}}>Masqué de la facturation</div>
              </button>
            </div>
          </div>

          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button style={btnG} onClick={()=>setShowForm(false)}>Annuler</button>
            <button style={btnP} onClick={save} disabled={saving}>{saving?'Enregistrement...':(editing?'Mettre à jour':'Créer le produit')}</button>
          </div>
          <div style={{textAlign:'center',marginTop:32,fontSize:11,color:'#c8c6be'}}>Développé par RS Comptabilité</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:17,fontWeight:600,letterSpacing:'-.3px'}}>Produits & Services</div>
          <div style={{fontSize:12,color:'#a8a69e',marginTop:2}}>{products.length} produit(s) dans le catalogue</div>
        </div>
        <button style={btnP} onClick={openNew}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouveau produit
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[
          { label:'Total produits', val:products.length, color:'#1a1916' },
          { label:'Disponibles', val:products.filter(p=>p.is_available).length, color:'#16a34a' },
          { label:'Prix moyen', val:dzd(avgPrice), color:'#2563EB', mono:true },
          { label:'Top produit', val:topProductData?.name || '—', color:'#7c3aed', small:true },
        ].map((s:any,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'14px 18px'}}>
            <div style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:s.small?14:20,fontWeight:700,color:s.color,fontFamily:s.mono?'JetBrains Mono,monospace':'Outfit,sans-serif',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:7,background:'#fff',border:'1px solid rgba(0,0,0,0.14)',borderRadius:5,padding:'7px 11px',flex:1,minWidth:180,maxWidth:320}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a8a69e" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input style={{background:'none',border:'none',outline:'none',color:'#1a1916',fontSize:13,fontFamily:'Outfit,sans-serif',width:'100%'}} placeholder="Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select style={{padding:'7px 11px',borderRadius:5,border:'1px solid rgba(0,0,0,0.14)',fontSize:12,background:'#fff',fontFamily:'Outfit,sans-serif',cursor:'pointer',appearance:'none',backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23a8a69e' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",backgroundRepeat:'no-repeat',backgroundPosition:'right 8px center',paddingRight:26}}
          value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
          <option value="tous">Toutes catégories</option>
          {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        {['tous','dispo','indispo'].map(a=>(
          <button key={a} onClick={()=>setAvailFilter(a)}
            style={{...btnSm,border:'1px solid rgba(0,0,0,0.14)',background:availFilter===a?'#2563EB':'#fff',color:availFilter===a?'#fff':'#6b6860'}}>
            {a==='tous'?'Tous':a==='dispo'?'Disponibles':'Indisponibles'}
          </button>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
            <thead>
              <tr>{['Produit','Catégorie','Prix HT','Utilisation','Disponibilité','Actions'].map(h=>(
                <th key={h} style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px',padding:'9px 14px',borderBottom:'1px solid rgba(0,0,0,0.08)',textAlign:'left',whiteSpace:'nowrap',background:'#f0eeea'}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'#a8a69e'}}>Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'#a8a69e'}}>Aucun produit trouvé</td></tr>
              ) : filtered.map(p => {
                const stats = billItems[p.id] || { count:0, qty:0, total:0 }
                return (
                  <tr key={p.id} style={{borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
                    <td style={{padding:'12px 14px'}}>
                      <div style={{fontSize:13,fontWeight:600,color:'#1a1916'}}>{p.name}</div>
                      {p.description && <div style={{fontSize:11,color:'#a8a69e',marginTop:2,maxWidth:300,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.description}</div>}
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <span style={{fontSize:11,background:'rgba(37,99,235,0.08)',color:'#2563EB',padding:'3px 8px',borderRadius:4,fontWeight:500}}>{p.category||'—'}</span>
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:600,color:'#16a34a'}}>{dzd(p.price)}</span>
                    </td>
                    <td style={{padding:'12px 14px',fontSize:12,color:'#6b6860'}}>
                      {stats.count > 0 ? (
                        <div>
                          <div>{stats.count} facture{stats.count>1?'s':''} · {stats.qty} unité{stats.qty>1?'s':''}</div>
                          <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'#16a34a',marginTop:2}}>CA: {dzd(stats.total)}</div>
                        </div>
                      ) : <span style={{color:'#a8a69e'}}>Jamais utilisé</span>}
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <button onClick={()=>toggleAvailability(p.id,p.is_available)}
                        style={{fontSize:11,padding:'4px 10px',borderRadius:20,fontWeight:600,cursor:'pointer',fontFamily:'Outfit,sans-serif',border:'none',background:p.is_available?'rgba(22,163,74,0.1)':'rgba(220,38,38,0.08)',color:p.is_available?'#15803d':'#dc2626'}}>
                        {p.is_available?'● Disponible':'○ Indisponible'}
                      </button>
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <div style={{display:'flex',gap:5}}>
                        <button style={{...btnSm,background:'transparent',color:'#6b6860',border:'1px solid rgba(0,0,0,0.14)'}} onClick={()=>openEdit(p)}>Modifier</button>
                        <button style={{...btnSm,background:'rgba(220,38,38,0.08)',color:'#dc2626',border:'1px solid rgba(220,38,38,0.15)'}} onClick={()=>archive(p.id)}>Archiver</button>
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