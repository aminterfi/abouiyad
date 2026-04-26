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
const UNITS = ['unité', 'kg', 'g', 'L', 'mL', 'm', 'm²', 'm³', 'h', 'jour', 'mois', 'forfait']

function Toggle({ checked, onChange, color = '#2563EB' }: { checked: boolean; onChange: (v: boolean) => void; color?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 999, border: 'none',
        background: checked ? color : '#cbd5e1',
        position: 'relative', cursor: 'pointer', transition: 'all .2s',
        flexShrink: 0,
      }}>
      <div style={{
        position: 'absolute', top: 2, left: checked ? 20 : 2,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

export default function ProduitsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [billItems, setBillItems] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('tous')
  const [availFilter, setAvailFilter] = useState('tous')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({
    name: '', price: '', category: 'Service', description: '', is_available: true,
    is_stockable: false, track_stock: false, stock_quantity: '0',
    stock_alert_threshold: '5', cost_price: '', unit: 'unité', barcode: ''
  })
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
    setForm({
      name: '', price: '', category: 'Service', description: '', is_available: true,
      is_stockable: false, track_stock: false, stock_quantity: '0',
      stock_alert_threshold: '5', cost_price: '', unit: 'unité', barcode: ''
    })
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
      is_available: p.is_available,
      is_stockable: p.is_stockable || false,
      track_stock: p.track_stock || false,
      stock_quantity: (p.stock_quantity || 0).toString(),
      stock_alert_threshold: (p.stock_alert_threshold || 5).toString(),
      cost_price: p.cost_price?.toString() || '',
      unit: p.unit || 'unité',
      barcode: p.barcode || '',
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
      const data: any = {
        name: form.name,
        price: parseFloat(form.price),
        category: form.category,
        description: form.description,
        is_available: form.is_available,
        is_stockable: form.is_stockable,
        track_stock: form.is_stockable && form.track_stock,
        cost_price: parseFloat(form.cost_price) || 0,
        unit: form.unit,
        barcode: form.barcode || null,
        stock_alert_threshold: parseFloat(form.stock_alert_threshold) || 5,
      }
      
      let productId: string
      
      if (editing) {
        // Update sans toucher au stock_quantity (géré par les triggers)
        await supabase.from('products').update(data).eq('id', editing.id)
        productId = editing.id
      } else {
        // Création : on définit le stock initial
        if (form.is_stockable && form.track_stock) {
          data.stock_quantity = 0 // sera défini par le mouvement initial
        }
        const { data: created, error: insErr } = await supabase.from('products').insert({
          ...data, created_by: user.id, company_id: user.company_id
        }).select().single()
        if (insErr) throw insErr
        productId = created.id
        
        // Si stock initial, créer un mouvement d'entrée
        if (form.is_stockable && form.track_stock && parseFloat(form.stock_quantity) > 0) {
          await supabase.from('stock_movements').insert({
            company_id: user.company_id,
            product_id: productId,
            movement_type: 'entry',
            quantity: parseFloat(form.stock_quantity),
            unit_cost: parseFloat(form.cost_price) || 0,
            reference_type: 'manual',
            notes: 'Stock initial à la création',
            created_by: user.id,
            created_by_name: user.full_name,
          })
        }
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
  const stockableCount = products.filter(p => p.is_stockable && p.track_stock).length

  // ===== FORM =====
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
                <div style={{color:'rgba(255,255,255,0.35)',fontSize:10}}>RSS — RS Comptabilité</div>
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

        <div style={{maxWidth:760,margin:'0 auto',padding:'32px 24px'}}>
          {error && (
            <div style={{background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'#dc2626',marginBottom:20}}>{error}</div>
          )}

          {/* INFOS DE BASE */}
          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'20px 24px',marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:14}}>📋 Informations</div>
            <div style={{marginBottom:14}}>
              <label style={lbl}>Désignation <span style={{color:'#dc2626'}}>*</span></label>
              <input autoFocus style={{...inp,fontSize:15,fontWeight:500}}
                placeholder="Ex: Bougie parfumée Vanille, Comptabilité mensuelle..."
                value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14}}>
              <div>
                <label style={lbl}>Prix de vente HT <span style={{color:'#dc2626'}}>*</span></label>
                <div style={{position:'relative'}}>
                  <input type="number" min="0" step="0.01" style={{...inp,paddingRight:50,fontWeight:600}}
                    placeholder="0" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/>
                  <div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'#a8a69e',fontWeight:600}}>DZD</div>
                </div>
              </div>
              <div>
                <label style={lbl}>Prix d'achat (coût)</label>
                <div style={{position:'relative'}}>
                  <input type="number" min="0" step="0.01" style={{...inp,paddingRight:50}}
                    placeholder="0" value={form.cost_price} onChange={e=>setForm({...form,cost_price:e.target.value})}/>
                  <div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'#a8a69e',fontWeight:600}}>DZD</div>
                </div>
              </div>
              <div>
                <label style={lbl}>Unité</label>
                <select style={{...inp,appearance:'none'}} value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>
                  {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
              <div>
                <label style={lbl}>Catégorie</label>
                <select style={{...inp,appearance:'none'}} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                  {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Code-barres / SKU</label>
                <input style={{...inp,fontFamily:'JetBrains Mono,monospace'}} placeholder="Optionnel"
                  value={form.barcode} onChange={e=>setForm({...form,barcode:e.target.value})}/>
              </div>
            </div>
            <div>
              <label style={lbl}>Description</label>
              <textarea style={{...inp,resize:'vertical',minHeight:60}} rows={2}
                placeholder="Description courte..."
                value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
            </div>
          </div>

          {/* GESTION STOCK */}
          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'20px 24px',marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:14}}>📦 Gestion de stock</div>
            
            {/* Toggle stockable */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:'#1a1916'}}>Produit stockable</div>
                <div style={{fontSize:11,color:'#a8a69e',marginTop:2}}>Cochez si c'est un produit physique (pas un service)</div>
              </div>
              <Toggle checked={form.is_stockable} onChange={(v)=>setForm({...form,is_stockable:v,track_stock:v?form.track_stock:false})} color="#16a34a"/>
            </div>

            {form.is_stockable && (
              <>
                {/* Toggle suivi stock */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:form.track_stock?'1px solid rgba(0,0,0,0.05)':'none'}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:'#1a1916'}}>Suivre le stock</div>
                    <div style={{fontSize:11,color:'#a8a69e',marginTop:2}}>Le stock baissera automatiquement à chaque vente</div>
                  </div>
                  <Toggle checked={form.track_stock} onChange={(v)=>setForm({...form,track_stock:v})} color="#2563EB"/>
                </div>

                {/* Stock initial + seuil */}
                {form.track_stock && (
                  <div style={{padding:'14px 0 0',display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                    {!editing && (
                      <div>
                        <label style={lbl}>Stock initial ({form.unit})</label>
                        <input type="number" min="0" step="0.01" style={{...inp,fontFamily:'JetBrains Mono,monospace'}}
                          placeholder="0" value={form.stock_quantity} onChange={e=>setForm({...form,stock_quantity:e.target.value})}/>
                      </div>
                    )}
                    {editing && (
                      <div>
                        <label style={lbl}>Stock actuel</label>
                        <div style={{...inp,background:'#f8f7f5',color:'#16a34a',fontWeight:700,fontFamily:'JetBrains Mono,monospace',cursor:'not-allowed'}}>
                          {editing.stock_quantity || 0} {form.unit}
                        </div>
                        <div style={{fontSize:10,color:'#a8a69e',marginTop:4}}>Modifiable depuis la page Stock</div>
                      </div>
                    )}
                    <div>
                      <label style={lbl}>Seuil d'alerte</label>
                      <input type="number" min="0" step="0.01" style={{...inp,fontFamily:'JetBrains Mono,monospace'}}
                        placeholder="5" value={form.stock_alert_threshold} onChange={e=>setForm({...form,stock_alert_threshold:e.target.value})}/>
                      <div style={{fontSize:10,color:'#a8a69e',marginTop:4}}>Alerte si stock ≤ ce seuil</div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* DISPONIBILITÉ */}
          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'20px 24px',marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:14}}>🟢 Disponibilité</div>
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
          <div style={{fontSize:12,color:'#a8a69e',marginTop:2}}>{products.length} produit(s) · {stockableCount} suivi(s) en stock</div>
        </div>
        <button style={btnP} onClick={openNew}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouveau produit
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:16}}>
        {[
          { label:'Total produits', val:products.length, color:'#1a1916' },
          { label:'Disponibles', val:products.filter(p=>p.is_available).length, color:'#16a34a' },
          { label:'Suivis en stock', val:stockableCount, color:'#d97706' },
          { label:'Prix moyen', val:dzd(avgPrice), color:'#2563EB', mono:true },
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
        <select style={{padding:'7px 11px',borderRadius:5,border:'1px solid rgba(0,0,0,0.14)',fontSize:12,background:'#fff',fontFamily:'Outfit,sans-serif',cursor:'pointer'}}
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
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:800}}>
            <thead>
              <tr>{['Produit','Type','Prix HT','Stock','Utilisation','Disponibilité','Actions'].map(h=>(
                <th key={h} style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px',padding:'9px 14px',borderBottom:'1px solid rgba(0,0,0,0.08)',textAlign:'left',whiteSpace:'nowrap',background:'#f0eeea'}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#a8a69e'}}>Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#a8a69e'}}>Aucun produit trouvé</td></tr>
              ) : filtered.map(p => {
                const stats = billItems[p.id] || { count:0, qty:0, total:0 }
                const isStockable = p.is_stockable && p.track_stock
                const stockStatus = isStockable ? (
                  p.stock_quantity <= 0 ? 'rupture' :
                  p.stock_quantity <= (p.stock_alert_threshold || 5) ? 'faible' : 'ok'
                ) : null
                const stockColors: any = { rupture:'#dc2626', faible:'#d97706', ok:'#16a34a' }
                return (
                  <tr key={p.id} style={{borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
                    <td style={{padding:'12px 14px'}}>
                      <div style={{fontSize:13,fontWeight:600,color:'#1a1916'}}>{p.name}</div>
                      {p.description && <div style={{fontSize:11,color:'#a8a69e',marginTop:2,maxWidth:300,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.description}</div>}
                      {p.barcode && <div style={{fontSize:10,color:'#a8a69e',marginTop:2,fontFamily:'JetBrains Mono,monospace'}}>SKU: {p.barcode}</div>}
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      {p.is_stockable ? (
                        <span style={{fontSize:11,background:'rgba(217,119,6,0.1)',color:'#d97706',padding:'3px 8px',borderRadius:4,fontWeight:600}}>📦 Produit</span>
                      ) : (
                        <span style={{fontSize:11,background:'rgba(124,58,237,0.1)',color:'#7c3aed',padding:'3px 8px',borderRadius:4,fontWeight:600}}>🛠 Service</span>
                      )}
                      <div style={{fontSize:10,color:'#a8a69e',marginTop:3}}>{p.category||'—'}</div>
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:600,color:'#16a34a'}}>{dzd(p.price)}</div>
                      {p.cost_price > 0 && <div style={{fontSize:10,color:'#a8a69e',fontFamily:'JetBrains Mono,monospace',marginTop:2}}>Coût: {dzd(p.cost_price)}</div>}
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      {isStockable ? (
                        <div>
                          <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:700,color:stockColors[stockStatus||'ok']}}>
                            {p.stock_quantity || 0} <span style={{fontSize:10,color:'#a8a69e',fontWeight:400}}>{p.unit||''}</span>
                          </div>
                          {stockStatus === 'rupture' && <div style={{fontSize:9,color:'#dc2626',fontWeight:600,marginTop:2}}>⚠ Rupture</div>}
                          {stockStatus === 'faible' && <div style={{fontSize:9,color:'#d97706',fontWeight:600,marginTop:2}}>⚠ Faible</div>}
                        </div>
                      ) : <span style={{fontSize:11,color:'#cbcabe'}}>Non suivi</span>}
                    </td>
                    <td style={{padding:'12px 14px',fontSize:12,color:'#6b6860'}}>
                      {stats.count > 0 ? (
                        <div>
                          <div>{stats.count} fact. · {stats.qty} u.</div>
                          <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'#16a34a',marginTop:2}}>{dzd(stats.total)}</div>
                        </div>
                      ) : <span style={{color:'#a8a69e'}}>Jamais</span>}
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <button onClick={()=>toggleAvailability(p.id,p.is_available)}
                        style={{fontSize:11,padding:'4px 10px',borderRadius:20,fontWeight:600,cursor:'pointer',fontFamily:'Outfit,sans-serif',border:'none',background:p.is_available?'rgba(22,163,74,0.1)':'rgba(220,38,38,0.08)',color:p.is_available?'#15803d':'#dc2626'}}>
                        {p.is_available?'● Dispo':'○ Indispo'}
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