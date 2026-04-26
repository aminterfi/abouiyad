'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Link from 'next/link'

function dzd(v:number){return (v||0).toLocaleString('fr-DZ',{minimumFractionDigits:2})+' DZD'}

const TYPE_LABELS: Record<string,{l:string,c:string,i:string}> = {
  entry:{l:'Entrée',c:'#16a34a',i:'↑'},
  sale:{l:'Vente',c:'#2563EB',i:'→'},
  sale_cancel:{l:'Annul. vente',c:'#7c3aed',i:'↩'},
  adjustment_add:{l:'Ajustement +',c:'#16a34a',i:'+'},
  adjustment_sub:{l:'Ajustement −',c:'#dc2626',i:'−'},
  return_in:{l:'Retour client',c:'#16a34a',i:'↩'},
  return_out:{l:'Retour fourn.',c:'#dc2626',i:'↪'},
}

export default function MouvementsPage() {
  const { slug } = useParams() as { slug: string }
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(()=>{ load() },[])

  async function load() {
    const u = JSON.parse(localStorage.getItem('user')||'{}')
    if(!u.company_id){setLoading(false);return}
    const { data } = await supabase.from('stock_movements')
      .select('*, products(name, unit)')
      .eq('company_id', u.company_id)
      .order('created_at', {ascending:false})
      .limit(500)
    setMovements(data||[])
    setLoading(false)
  }

  const filtered = movements.filter(m => filter==='all' || m.movement_type===filter)

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18,flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontSize:17,fontWeight:600}}>Mouvements de stock</div>
          <div style={{fontSize:12,color:'#a8a69e',marginTop:2}}>{movements.length} mouvement(s)</div>
        </div>
        <Link href={`/${slug}/dashboard/stock`} style={{padding:'9px 16px',fontSize:12,background:'#fff',color:'#6b6860',border:'1px solid rgba(0,0,0,0.14)',borderRadius:6,textDecoration:'none'}}>← Retour stock</Link>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        {[{v:'all',l:'Tous'},{v:'entry',l:'Entrées'},{v:'sale',l:'Ventes'},{v:'adjustment_add',l:'Ajout'},{v:'adjustment_sub',l:'Retrait'}].map(f=>(
          <button key={f.v} onClick={()=>setFilter(f.v)}
            style={{padding:'7px 14px',fontSize:12,borderRadius:5,border:'1px solid rgba(0,0,0,0.14)',cursor:'pointer',background:filter===f.v?'#2563EB':'#fff',color:filter===f.v?'#fff':'#6b6860'}}>
            {f.l}
          </button>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,overflow:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
          <thead>
            <tr style={{background:'#f0eeea'}}>
              {['Date','Produit','Type','Quantité','Avant','Après','Réf.','Note'].map(h=>(
                <th key={h} style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',padding:'10px 14px',textAlign:'left',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading?<tr><td colSpan={8} style={{padding:30,textAlign:'center',color:'#a8a69e'}}>Chargement...</td></tr>
            :filtered.length===0?<tr><td colSpan={8} style={{padding:30,textAlign:'center',color:'#a8a69e'}}>Aucun mouvement</td></tr>
            :filtered.map(m=>{
              const t = TYPE_LABELS[m.movement_type] || {l:m.movement_type,c:'#6b6860',i:'?'}
              return (
                <tr key={m.id} style={{borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
                  <td style={{padding:'10px 14px',fontSize:11,color:'#6b6860',whiteSpace:'nowrap'}}>
                    <div style={{fontWeight:500,color:'#1a1916'}}>{new Date(m.created_at).toLocaleDateString('fr-DZ')}</div>
                    <div style={{fontSize:10,color:'#a8a69e'}}>{new Date(m.created_at).toLocaleTimeString('fr-DZ',{hour:'2-digit',minute:'2-digit'})}</div>
                  </td>
                  <td style={{padding:'10px 14px',fontSize:13,fontWeight:500}}>{m.products?.name||'—'}</td>
                  <td style={{padding:'10px 14px'}}>
                    <span style={{fontSize:10,padding:'3px 8px',borderRadius:4,background:`${t.c}15`,color:t.c,fontWeight:600,whiteSpace:'nowrap'}}>{t.i} {t.l}</span>
                  </td>
                  <td style={{padding:'10px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:700,color:t.c}}>
                    {m.movement_type==='sale'||m.movement_type==='adjustment_sub'||m.movement_type==='return_out'?'−':'+'}{m.quantity}
                  </td>
                  <td style={{padding:'10px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'#a8a69e'}}>{m.stock_before}</td>
                  <td style={{padding:'10px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:600}}>{m.stock_after}</td>
                  <td style={{padding:'10px 14px',fontSize:11,color:'#2563EB',fontFamily:'JetBrains Mono,monospace'}}>{m.reference_number||'—'}</td>
                  <td style={{padding:'10px 14px',fontSize:11,color:'#6b6860'}}>{m.notes||'—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}