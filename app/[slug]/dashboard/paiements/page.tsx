'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function dzd(v: number) { return (v||0).toLocaleString('fr-DZ',{minimumFractionDigits:2})+' DZD' }

const inp: React.CSSProperties = { width:'100%', background:'#f0eeea', border:'1px solid rgba(0,0,0,0.14)', borderRadius:6, padding:'9px 12px', fontSize:13, color:'#1a1916', fontFamily:'Outfit,sans-serif', outline:'none' }
const btnSm: React.CSSProperties = { padding:'5px 10px', fontSize:12, borderRadius:5, cursor:'pointer', fontFamily:'Outfit,sans-serif' }

export default function PaiementsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [method, setMethod] = useState('tous')
  const [period, setPeriod] = useState('tout')

  useEffect(() => { fetch() }, [])

  async function fetch() {
    setLoading(true)
    const u = JSON.parse(localStorage.getItem('user')||'{}')
    if (!u.company_id) return
    const { data } = await supabase
      .from('payments')
      .select('*, bills(invoice_number, total_amount, paid_amount, status, clients(full_name)), users:created_by(full_name)')
      .eq('company_id', u.company_id)
      .order('created_at',{ascending:false})
    setPayments(data||[])
    setLoading(false)
  }

  const filtered = payments.filter(p => {
    const matchSearch = !search ||
      p.bills?.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.bills?.clients?.full_name?.toLowerCase().includes(search.toLowerCase())
    const matchMethod = method === 'tous' || p.method === method
    const d = new Date(p.created_at)
    const now = new Date()
    const matchPeriod = period === 'tout' ||
      (period === 'jour' && d.toDateString() === now.toDateString()) ||
      (period === 'semaine' && (now.getTime() - d.getTime()) < 7*86400000) ||
      (period === 'mois' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) ||
      (period === 'annee' && d.getFullYear() === now.getFullYear())
    return matchSearch && matchMethod && matchPeriod
  })

  const totalEncaisse = filtered.reduce((s,p) => s + (p.amount||0), 0)
  const today = new Date().toDateString()
  const totalToday = payments.filter(p => new Date(p.created_at).toDateString() === today).reduce((s,p)=>s+p.amount,0)
  const methods = [...new Set(payments.map(p => p.method).filter(Boolean))]

  const methodColors: Record<string,string> = {
    'Virement CPA': '#2563EB',
    'Virement BNA': '#7c3aed',
    'Virement BEA': '#0d9488',
    'BaridiMob': '#16a34a',
    'Chèque': '#d97706',
    'Espèces': '#dc2626',
  }

  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:17,fontWeight:600,letterSpacing:'-.3px'}}>Paiements</div>
          <div style={{fontSize:12,color:'#a8a69e',marginTop:2}}>Historique de tous les règlements encaissés</div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[
          { label:'Total encaissé (filtre)', val:dzd(totalEncaisse), color:'#16a34a' },
          { label:"Aujourd'hui", val:dzd(totalToday), color:'#2563EB' },
          { label:'Nb paiements', val:payments.length, color:'#1a1916', mono:false },
          { label:'Ticket moyen', val:dzd(payments.length?totalEncaisse/payments.length:0), color:'#7c3aed' },
        ].map((s:any,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'14px 18px'}}>
            <div style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:18,fontWeight:700,color:s.color,fontFamily:'JetBrains Mono,monospace'}}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:7,background:'#fff',border:'1px solid rgba(0,0,0,0.14)',borderRadius:5,padding:'7px 11px',flex:1,minWidth:180,maxWidth:320}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a8a69e" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input style={{background:'none',border:'none',outline:'none',color:'#1a1916',fontSize:13,fontFamily:'Outfit,sans-serif',width:'100%'}} placeholder="Rechercher facture ou client..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select style={{padding:'7px 11px',borderRadius:5,border:'1px solid rgba(0,0,0,0.14)',fontSize:12,background:'#fff',fontFamily:'Outfit,sans-serif',cursor:'pointer'}} value={method} onChange={e=>setMethod(e.target.value)}>
          <option value="tous">Toutes méthodes</option>
          {methods.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        {[
          {v:'tout',l:'Tout'},
          {v:'jour',l:"Aujourd'hui"},
          {v:'semaine',l:'7 jours'},
          {v:'mois',l:'Ce mois'},
          {v:'annee',l:'Année'},
        ].map(p=>(
          <button key={p.v} onClick={()=>setPeriod(p.v)}
            style={{...btnSm,border:'1px solid rgba(0,0,0,0.14)',background:period===p.v?'#2563EB':'#fff',color:period===p.v?'#fff':'#6b6860'}}>
            {p.l}
          </button>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
            <thead>
              <tr>{['Date','Facture','Client','Montant','Méthode','Enregistré par','Solde facture'].map(h=>(
                <th key={h} style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px',padding:'9px 14px',borderBottom:'1px solid rgba(0,0,0,0.08)',textAlign:'left',whiteSpace:'nowrap',background:'#f0eeea'}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#a8a69e'}}>Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#a8a69e'}}>Aucun paiement trouvé</td></tr>
              ) : filtered.map(p => {
                const remaining = (p.bills?.total_amount || 0) - (p.bills?.paid_amount || 0)
                return (
                  <tr key={p.id} style={{borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
                    <td style={{padding:'12px 14px',fontSize:12}}>
                      <div style={{fontWeight:500}}>{new Date(p.created_at).toLocaleDateString('fr-DZ')}</div>
                      <div style={{color:'#a8a69e',fontSize:11,marginTop:2}}>{new Date(p.created_at).toLocaleTimeString('fr-DZ',{hour:'2-digit',minute:'2-digit'})}</div>
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'#2563EB',fontWeight:500}}>{p.bills?.invoice_number||'—'}</span>
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:26,height:26,borderRadius:'50%',background:'rgba(37,99,235,0.1)',color:'#2563EB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:600}}>
                          {p.bills?.clients?.full_name?.split(' ').map((w:string)=>w[0]).slice(0,2).join('')||'?'}
                        </div>
                        <span style={{fontSize:13,fontWeight:500}}>{p.bills?.clients?.full_name||'—'}</span>
                      </div>
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:700,color:'#16a34a'}}>+{dzd(p.amount)}</span>
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <span style={{fontSize:11,background:`${methodColors[p.method]||'#6b6860'}15`,color:methodColors[p.method]||'#6b6860',padding:'3px 9px',borderRadius:4,fontWeight:600,border:`1px solid ${methodColors[p.method]||'#6b6860'}30`}}>
                        {p.method||'—'}
                      </span>
                    </td>
                    <td style={{padding:'12px 14px',fontSize:12,color:'#6b6860'}}>{p.users?.full_name||'—'}</td>
                    <td style={{padding:'12px 14px'}}>
                      {p.bills?.status === 'payé' ? (
                        <span style={{fontSize:11,background:'rgba(22,163,74,0.1)',color:'#15803d',padding:'3px 9px',borderRadius:20,fontWeight:600}}>● Réglée</span>
                      ) : (
                        <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'#d97706'}}>{dzd(remaining)}</span>
                      )}
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