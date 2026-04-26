'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function InventairePage() {
  const { slug } = useParams() as { slug: string }
  const [products, setProducts] = useState<any[]>([])
  const [counts, setCounts] = useState<Record<string,string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

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

  async function applyInventory() {
    if(!confirm('Appliquer les écarts d\'inventaire ? Les stocks seront ajustés automatiquement.')) return
    setSaving(true)
    const u = JSON.parse(localStorage.getItem('user')||'{}')
    const movements: any[] = []
    
    products.forEach(p=>{
      const counted = parseFloat(counts[p.id])
      if(isNaN(counted)) return
      const diff = counted - p.stock_quantity
      if(diff === 0) return
      
      movements.push({
        company_id: u.company_id,
        product_id: p.id,
        movement_type: diff > 0 ? 'adjustment_add' : 'adjustment_sub',
        quantity: Math.abs(diff),
        unit_cost: p.cost_price || 0,
        reference_type: 'inventory',
        notes: `Inventaire physique : compté ${counted}, théorique ${p.stock_quantity}`,
        created_by: u.id,
        created_by_name: u.full_name,
      })
    })

    if(movements.length===0){
      setMsg('Aucun écart à appliquer'); setSaving(false); return
    }

    const { error } = await supabase.from('stock_movements').insert(movements)
    if(error){alert(error.message);setSaving(false);return}
    setMsg(`✓ ${movements.length} ajustement(s) appliqué(s)`)
    setCounts({})
    load()
    setSaving(false)
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18,flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontSize:17,fontWeight:600}}>Inventaire physique</div>
          <div style={{fontSize:12,color:'#a8a69e',marginTop:2}}>Saisissez les quantités réelles comptées</div>
        </div>
        <Link href={`/${slug}/dashboard/stock`} style={{padding:'9px 16px',fontSize:12,background:'#fff',color:'#6b6860',border:'1px solid rgba(0,0,0,0.14)',borderRadius:6,textDecoration:'none'}}>← Retour</Link>
      </div>

      {msg && <div style={{background:'rgba(22,163,74,0.06)',border:'1px solid rgba(22,163,74,0.2)',color:'#16a34a',padding:'10px 14px',borderRadius:6,fontSize:13,marginBottom:14}}>{msg}</div>}

      <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,overflow:'auto',marginBottom:14}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
          <thead>
            <tr style={{background:'#f0eeea'}}>
              {['Produit','Stock théorique','Stock compté','Écart'].map(h=>(
                <th key={h} style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',padding:'10px 14px',textAlign:'left'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading?<tr><td colSpan={4} style={{padding:30,textAlign:'center',color:'#a8a69e'}}>Chargement...</td></tr>
            :products.length===0?<tr><td colSpan={4} style={{padding:30,textAlign:'center',color:'#a8a69e'}}>Aucun produit suivi</td></tr>
            :products.map(p=>{
              const counted = parseFloat(counts[p.id])
              const diff = !isNaN(counted) ? counted - p.stock_quantity : null
              return (
                <tr key={p.id} style={{borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
                  <td style={{padding:'12px 14px',fontSize:13,fontWeight:500}}>{p.name}</td>
                  <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:600}}>{p.stock_quantity} <span style={{color:'#a8a69e',fontSize:11}}>{p.unit||''}</span></td>
                  <td style={{padding:'12px 14px'}}>
                    <input type="number" min="0" step="0.01" value={counts[p.id]||''} onChange={e=>setCounts({...counts,[p.id]:e.target.value})}
                      placeholder="Saisir..."
                      style={{width:120,padding:'7px 10px',fontSize:13,border:'1px solid rgba(0,0,0,0.14)',borderRadius:5,fontFamily:'JetBrains Mono,monospace'}}/>
                  </td>
                  <td style={{padding:'12px 14px'}}>
                    {diff===null?<span style={{color:'#cbcabe'}}>—</span>
                    :diff===0?<span style={{color:'#16a34a',fontSize:12,fontWeight:600}}>✓ OK</span>
                    :<span style={{color:diff>0?'#16a34a':'#dc2626',fontFamily:'JetBrains Mono,monospace',fontWeight:700,fontSize:13}}>{diff>0?'+':''}{diff}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <button onClick={applyInventory} disabled={saving||Object.keys(counts).length===0}
        style={{width:'100%',padding:14,fontSize:14,fontWeight:600,background:saving?'#a8a69e':'#16a34a',color:'#fff',border:'none',borderRadius:8,cursor:saving?'not-allowed':'pointer',fontFamily:'inherit'}}>
        {saving?'Application...':`✓ Appliquer les écarts (${Object.keys(counts).filter(k=>counts[k]).length} ligne(s))`}
      </button>
    </div>
  )
}