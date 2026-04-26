'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function dzd(v:number){return (v||0).toLocaleString('fr-DZ',{minimumFractionDigits:2})+' DZD'}

export default function StockPage() {
  const { slug } = useParams() as { slug: string }
  const router = useRouter()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('tous')
  const [showMov, setShowMov] = useState<any>(null)
  const [movType, setMovType] = useState<'entry'|'adjustment_add'|'adjustment_sub'>('entry')
  const [movQty, setMovQty] = useState('')
  const [movCost, setMovCost] = useState('')
  const [movNote, setMovNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(()=>{ load() },[])

  async function load() {
    const u = JSON.parse(localStorage.getItem('user')||'{}')
    if(!u.company_id){setLoading(false);return}
    const { data } = await supabase.from('products')
      .select('*')
      .eq('company_id', u.company_id)
      .eq('is_stockable', true)
      .eq('track_stock', true)
      .eq('is_archived', false)
      .order('name')
    setProducts(data||[])
    setLoading(false)
  }

  async function saveMovement() {
    if(!showMov || !movQty) return
    const u = JSON.parse(localStorage.getItem('user')||'{}')
    setSaving(true)
    const { error } = await supabase.from('stock_movements').insert({
      company_id: u.company_id,
      product_id: showMov.id,
      movement_type: movType,
      quantity: parseFloat(movQty),
      unit_cost: parseFloat(movCost) || showMov.cost_price || 0,
      reference_type: 'manual',
      notes: movNote || null,
      created_by: u.id,
      created_by_name: u.full_name,
    })
    if(error){alert(error.message);setSaving(false);return}
    setShowMov(null); setMovQty(''); setMovCost(''); setMovNote('')
    load(); setSaving(false)
  }

  const filtered = products.filter(p=>{
    if(search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if(filter==='rupture' && p.stock_quantity > 0) return false
    if(filter==='faible' && (p.stock_quantity <= 0 || p.stock_quantity > p.stock_alert_threshold)) return false
    if(filter==='ok' && p.stock_quantity <= p.stock_alert_threshold) return false
    return true
  })

  const stats = {
    total: products.length,
    rupture: products.filter(p=>p.stock_quantity<=0).length,
    faible: products.filter(p=>p.stock_quantity>0 && p.stock_quantity<=p.stock_alert_threshold).length,
    valeur: products.reduce((s,p)=>s+(p.stock_quantity*(p.cost_price||0)),0),
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18,flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontSize:17,fontWeight:600}}>Stock & Inventaire</div>
          <div style={{fontSize:12,color:'#a8a69e',marginTop:2}}>{products.length} produit(s) suivi(s)</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <Link href={`/${slug}/dashboard/stock/mouvements`} style={{padding:'9px 16px',fontSize:12,background:'#fff',color:'#6b6860',border:'1px solid rgba(0,0,0,0.14)',borderRadius:6,textDecoration:'none'}}>📊 Mouvements</Link>
          <Link href={`/${slug}/dashboard/stock/inventaire`} style={{padding:'9px 16px',fontSize:12,background:'#2563EB',color:'#fff',borderRadius:6,textDecoration:'none',fontWeight:500}}>📋 Inventaire</Link>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:16}}>
        {[
          {label:'Produits suivis',val:stats.total,color:'#2563EB'},
          {label:'En rupture',val:stats.rupture,color:'#dc2626'},
          {label:'Stock faible',val:stats.faible,color:'#d97706'},
          {label:'Valeur stock',val:dzd(stats.valeur),color:'#16a34a',mono:true},
        ].map((s,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'14px 18px'}}>
            <div style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:18,fontWeight:700,color:s.color,fontFamily:s.mono?'JetBrains Mono,monospace':'inherit'}}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <input placeholder="Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{flex:1,minWidth:180,padding:'8px 12px',border:'1px solid rgba(0,0,0,0.14)',borderRadius:6,fontSize:13,fontFamily:'inherit'}}/>
        {[{v:'tous',l:'Tous'},{v:'rupture',l:'Rupture'},{v:'faible',l:'Faible'},{v:'ok',l:'OK'}].map(f=>(
          <button key={f.v} onClick={()=>setFilter(f.v)}
            style={{padding:'7px 14px',fontSize:12,borderRadius:5,border:'1px solid rgba(0,0,0,0.14)',cursor:'pointer',background:filter===f.v?'#2563EB':'#fff',color:filter===f.v?'#fff':'#6b6860'}}>
            {f.l}
          </button>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,overflow:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:800}}>
          <thead>
            <tr style={{background:'#f0eeea'}}>
              {['Produit','Stock actuel','Seuil','Prix achat','Valeur','Statut','Actions'].map(h=>(
                <th key={h} style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',padding:'10px 14px',textAlign:'left',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading?<tr><td colSpan={7} style={{padding:30,textAlign:'center',color:'#a8a69e'}}>Chargement...</td></tr>
            :filtered.length===0?<tr><td colSpan={7} style={{padding:30,textAlign:'center',color:'#a8a69e'}}>Aucun produit suivi en stock. Activez "Suivre le stock" sur vos produits.</td></tr>
            :filtered.map(p=>{
              const status = p.stock_quantity<=0?'rupture':p.stock_quantity<=p.stock_alert_threshold?'faible':'ok'
              const colors = {rupture:'#dc2626',faible:'#d97706',ok:'#16a34a'}
              return (
                <tr key={p.id} style={{borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
                  <td style={{padding:'12px 14px',fontSize:13,fontWeight:500}}>{p.name}</td>
                  <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:700,color:colors[status]}}>
                    {p.stock_quantity} <span style={{color:'#a8a69e',fontWeight:400,fontSize:11}}>{p.unit||''}</span>
                  </td>
                  <td style={{padding:'12px 14px',fontSize:12,color:'#6b6860',fontFamily:'JetBrains Mono,monospace'}}>{p.stock_alert_threshold}</td>
                  <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'#6b6860'}}>{dzd(p.cost_price||0)}</td>
                  <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'#16a34a',fontWeight:600}}>{dzd(p.stock_quantity*(p.cost_price||0))}</td>
                  <td style={{padding:'12px 14px'}}>
                    <span style={{fontSize:10,padding:'3px 8px',borderRadius:20,background:`${colors[status]}15`,color:colors[status],fontWeight:600,textTransform:'uppercase'}}>
                      {status==='rupture'?'⚠ Rupture':status==='faible'?'⚠ Faible':'✓ OK'}
                    </span>
                  </td>
                  <td style={{padding:'12px 14px'}}>
                    <button onClick={()=>{setShowMov(p);setMovType('entry')}}
                      style={{padding:'5px 10px',fontSize:11,background:'rgba(22,163,74,0.1)',color:'#16a34a',border:'1px solid rgba(22,163,74,0.2)',borderRadius:4,cursor:'pointer',fontWeight:600}}>+ Mouvement</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showMov && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20}} onClick={()=>setShowMov(null)}>
          <div style={{background:'#fff',borderRadius:14,padding:26,maxWidth:440,width:'100%'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:17,fontWeight:700,marginBottom:4}}>Mouvement de stock</div>
            <div style={{fontSize:12,color:'#a8a69e',marginBottom:18}}>{showMov.name} · Stock actuel : <strong>{showMov.stock_quantity} {showMov.unit||''}</strong></div>
            
            <label style={{fontSize:12,color:'#6b6860',marginBottom:6,display:'block',fontWeight:500}}>Type de mouvement</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:14}}>
              {[{v:'entry',l:'Entrée',c:'#16a34a',i:'↑'},{v:'adjustment_add',l:'Ajout',c:'#2563EB',i:'+'},{v:'adjustment_sub',l:'Retrait',c:'#dc2626',i:'−'}].map(t=>(
                <button key={t.v} onClick={()=>setMovType(t.v as any)}
                  style={{padding:10,fontSize:12,fontWeight:600,borderRadius:6,border:`1px solid ${movType===t.v?t.c:'rgba(0,0,0,0.14)'}`,background:movType===t.v?`${t.c}15`:'#fff',color:movType===t.v?t.c:'#6b6860',cursor:'pointer',fontFamily:'inherit'}}>
                  {t.i} {t.l}
                </button>
              ))}
            </div>

            <label style={{fontSize:12,color:'#6b6860',marginBottom:6,display:'block',fontWeight:500}}>Quantité *</label>
            <input type="number" min="0" step="0.01" autoFocus value={movQty} onChange={e=>setMovQty(e.target.value)}
              style={{width:'100%',padding:'10px 12px',fontSize:13,border:'1px solid rgba(0,0,0,0.14)',borderRadius:6,marginBottom:14,fontFamily:'inherit'}}/>

            {movType==='entry' && <>
              <label style={{fontSize:12,color:'#6b6860',marginBottom:6,display:'block',fontWeight:500}}>Prix d'achat unitaire</label>
              <input type="number" min="0" step="0.01" value={movCost} onChange={e=>setMovCost(e.target.value)} placeholder={`Défaut : ${showMov.cost_price||0}`}
                style={{width:'100%',padding:'10px 12px',fontSize:13,border:'1px solid rgba(0,0,0,0.14)',borderRadius:6,marginBottom:14,fontFamily:'inherit'}}/>
            </>}

            <label style={{fontSize:12,color:'#6b6860',marginBottom:6,display:'block',fontWeight:500}}>Note (optionnel)</label>
            <textarea value={movNote} onChange={e=>setMovNote(e.target.value)} rows={2} placeholder="Raison, fournisseur..."
              style={{width:'100%',padding:'10px 12px',fontSize:13,border:'1px solid rgba(0,0,0,0.14)',borderRadius:6,marginBottom:18,fontFamily:'inherit',resize:'vertical'}}/>

            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setShowMov(null)} style={{flex:1,padding:11,fontSize:12,background:'transparent',color:'#6b6860',border:'1px solid rgba(0,0,0,0.14)',borderRadius:6,cursor:'pointer',fontFamily:'inherit'}}>Annuler</button>
              <button onClick={saveMovement} disabled={saving||!movQty} style={{flex:2,padding:11,fontSize:12,fontWeight:600,background:saving?'#a8a69e':'#2563EB',color:'#fff',border:'none',borderRadius:6,cursor:saving?'not-allowed':'pointer',fontFamily:'inherit'}}>
                {saving?'Enregistrement...':'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}