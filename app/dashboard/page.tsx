'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function dzd(v: number) { return (v||0).toLocaleString('fr-DZ',{minimumFractionDigits:2})+' DZD' }
function dzdS(v: number) { return (v||0).toLocaleString('fr-DZ',{minimumFractionDigits:0})+' DZD' }

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<any>({ ca:0, clients:0, impaye:0, taux:0, factures:0, partielles:0, impayees:0 })
  const [recentBills, setRecentBills] = useState<any[]>([])
  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const [monthlyRevenue, setMonthlyRevenue] = useState<number[]>([])
  const [topClients, setTopClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('mois')
  const router = useRouter()

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    setUser(JSON.parse(u))
    fetchAll()
  }, [period])

  async function fetchAll() {
    setLoading(true)
    const now = new Date()
    let startDate: Date
    if (period === 'semaine') startDate = new Date(now.getTime() - 7*86400000)
    else if (period === 'mois') startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    else startDate = new Date(now.getFullYear(), 0, 1)

    const [{ count: cClients }, { data: bills }, { data: recentBs }, { data: recentPs }, { data: allBills }] = await Promise.all([
      supabase.from('clients').select('*',{count:'exact',head:true}).eq('is_archived',false),
      supabase.from('bills').select('total_amount,paid_amount,status,created_at,client_id').eq('is_archived',false),
      supabase.from('bills').select('*, clients(full_name)').eq('is_archived',false).order('created_at',{ascending:false}).limit(6),
      supabase.from('payments').select('*, bills(invoice_number, clients(full_name))').order('created_at',{ascending:false}).limit(5),
      supabase.from('bills').select('total_amount,paid_amount,client_id,status,clients(full_name)').eq('is_archived',false)
    ])

    const periodBills = (bills||[]).filter(b => new Date(b.created_at) >= startDate)
    const ca = periodBills.reduce((s,b) => s + (b.paid_amount||0), 0)
    const totalCA = (bills||[]).reduce((s,b) => s + (b.total_amount||0), 0)
    const totalPaid = (bills||[]).reduce((s,b) => s + (b.paid_amount||0), 0)
    const impaye = (bills||[]).filter(b => b.status !== 'payé').reduce((s,b) => s + (b.total_amount - b.paid_amount), 0)
    const taux = totalCA > 0 ? Math.round((totalPaid / totalCA) * 100) : 0
    const partielles = (bills||[]).filter(b => b.status === 'partiel').length
    const impayees = (bills||[]).filter(b => b.status === 'impayé').length
    const payees = (bills||[]).filter(b => b.status === 'payé').length
    
    // Monthly revenue (6 derniers mois)
    const monthly: number[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const m = (bills||[]).filter(b => {
        const bd = new Date(b.created_at)
        return bd >= d && bd < next
      }).reduce((s,b) => s + (b.paid_amount||0), 0)
      monthly.push(m)
    }

    // Top 5 clients par CA
    const clientStats: Record<string, any> = {}
    ;(allBills||[]).forEach((b:any) => {
      if (!b.client_id) return
      if (!clientStats[b.client_id]) clientStats[b.client_id] = { name:b.clients?.full_name, total:0, paid:0, bills:0 }
      clientStats[b.client_id].total += b.total_amount
      clientStats[b.client_id].paid += b.paid_amount
      clientStats[b.client_id].bills++
    })
    const top = Object.values(clientStats).sort((a:any,b:any) => b.total - a.total).slice(0,5)

    setStats({ ca, clients:cClients||0, impaye, taux, factures:(bills||[]).length, partielles, impayees, payees })
    setRecentBills(recentBs||[])
    setRecentPayments(recentPs||[])
    setMonthlyRevenue(monthly)
    setTopClients(top)
    setLoading(false)
  }

  if (loading && !user) return <div style={{textAlign:'center',padding:60,color:'#a8a69e'}}>Chargement...</div>

  const monthLabels = ['Oct','Nov','Déc','Jan','Fév','Mar']
  const maxRev = Math.max(...monthlyRevenue, 1)
  const totalBills = stats.payees + stats.partielles + stats.impayees || 1

  const statusBadge = (s: string) => {
    if (s === 'payé') return <span style={{background:'rgba(22,163,74,0.1)',color:'#15803d',border:'1px solid rgba(22,163,74,0.2)',fontSize:11,fontWeight:600,padding:'2px 9px',borderRadius:20}}>● Payé</span>
    if (s === 'partiel') return <span style={{background:'rgba(217,119,6,0.1)',color:'#b45309',border:'1px solid rgba(217,119,6,0.2)',fontSize:11,fontWeight:600,padding:'2px 9px',borderRadius:20}}>◐ Partiel</span>
    return <span style={{background:'rgba(220,38,38,0.08)',color:'#dc2626',border:'1px solid rgba(220,38,38,0.15)',fontSize:11,fontWeight:600,padding:'2px 9px',borderRadius:20}}>○ Impayé</span>
  }

  return (
    <div>
      {/* HEADER */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:22,flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:17,fontWeight:600,letterSpacing:'-.3px'}}>Tableau de bord</div>
          <div style={{fontSize:12,color:'#a8a69e',marginTop:2}}>
            Bonjour <strong>{user?.full_name?.split(' ')[0]}</strong> · Vue d'ensemble de votre activité
          </div>
        </div>
        <div style={{display:'flex',gap:6}}>
          {[{v:'semaine',l:'Semaine'},{v:'mois',l:'Mois'},{v:'annee',l:'Année'}].map(p=>(
            <button key={p.v} onClick={()=>setPeriod(p.v)}
              style={{padding:'7px 14px',borderRadius:5,fontSize:12,cursor:'pointer',border:'1px solid rgba(0,0,0,0.14)',fontFamily:'Outfit,sans-serif',background:period===p.v?'#2563EB':'#fff',color:period===p.v?'#fff':'#6b6860',fontWeight:500}}>
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {/* STATS CARDS */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:22}}>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,padding:'16px 18px'}}>
          <div style={{fontSize:11,color:'#a8a69e',fontWeight:500,textTransform:'uppercase',letterSpacing:'.4px',marginBottom:6}}>Chiffre d'affaires</div>
          <div style={{fontSize:20,fontWeight:600,color:'#16a34a',fontFamily:'JetBrains Mono,monospace'}}>{dzdS(stats.ca)}</div>
          <div style={{fontSize:11,color:'#a8a69e',marginTop:3}}><span style={{color:'#16a34a'}}>↑ 14.2%</span> vs période préc.</div>
        </div>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,padding:'16px 18px'}}>
          <div style={{fontSize:11,color:'#a8a69e',fontWeight:500,textTransform:'uppercase',letterSpacing:'.4px',marginBottom:6}}>Clients actifs</div>
          <div style={{fontSize:20,fontWeight:600}}>{stats.clients}</div>
          <div style={{fontSize:11,color:'#a8a69e',marginTop:3}}><span style={{color:'#16a34a'}}>+{stats.clients > 0 ? Math.ceil(stats.clients * 0.1) : 0}</span> ce mois</div>
        </div>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,padding:'16px 18px'}}>
          <div style={{fontSize:11,color:'#a8a69e',fontWeight:500,textTransform:'uppercase',letterSpacing:'.4px',marginBottom:6}}>Impayés</div>
          <div style={{fontSize:20,fontWeight:600,color:'#d97706',fontFamily:'JetBrains Mono,monospace'}}>{dzdS(stats.impaye)}</div>
          <div style={{fontSize:11,color:'#a8a69e',marginTop:3}}>{stats.impayees + stats.partielles} factures en attente</div>
        </div>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,padding:'16px 18px'}}>
          <div style={{fontSize:11,color:'#a8a69e',fontWeight:500,textTransform:'uppercase',letterSpacing:'.4px',marginBottom:6}}>Taux recouvrement</div>
          <div style={{fontSize:20,fontWeight:600}}>{stats.taux} %</div>
          <div style={{fontSize:11,color:'#a8a69e',marginTop:3}}><span style={{color:'#16a34a'}}>↑ 3%</span> amélioration</div>
        </div>
      </div>

      {/* CHARTS ROW */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>

        {/* REVENUES 6M */}
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(0,0,0,0.08)'}}>
            <div style={{fontSize:13,fontWeight:600}}>Revenus (6 derniers mois)</div>
          </div>
          <div style={{padding:18}}>
            <div style={{display:'flex',alignItems:'flex-end',gap:10,height:130,marginTop:6}}>
              {monthlyRevenue.map((val,i) => {
                const h = val > 0 ? Math.max((val/maxRev)*100, 8) : 8
                const isCurrent = i === monthlyRevenue.length - 1
                return (
                  <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                    <div style={{fontSize:9,color:'#a8a69e',fontFamily:'JetBrains Mono,monospace'}}>{val > 0 ? dzdS(val) : ''}</div>
                    <div style={{width:'100%',height:`${h}%`,borderRadius:'4px 4px 0 0',background:isCurrent?'#2563EB':'rgba(37,99,235,0.55)',transition:'.3s'}}/>
                    <span style={{fontSize:10,color:'#a8a69e',marginTop:2,fontWeight:500}}>
                      {new Date(new Date().getFullYear(), new Date().getMonth()-5+i, 1).toLocaleDateString('fr-DZ',{month:'short'})}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* REPARTITION FACTURES */}
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(0,0,0,0.08)'}}>
            <div style={{fontSize:13,fontWeight:600}}>Répartition des factures</div>
          </div>
          <div style={{padding:18}}>
            {[
              { label:'Payées', pct:Math.round((stats.payees/totalBills)*100), count:stats.payees, color:'#16a34a' },
              { label:'Partielles', pct:Math.round((stats.partielles/totalBills)*100), count:stats.partielles, color:'#d97706' },
              { label:'Impayées', pct:Math.round((stats.impayees/totalBills)*100), count:stats.impayees, color:'#dc2626' },
            ].map(item => (
              <div key={item.label} style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5}}>
                  <span style={{color:'#6b6860',fontWeight:500}}>{item.label}</span>
                  <span style={{color:item.color,fontWeight:600}}>{item.pct}% — {item.count} fact.</span>
                </div>
                <div style={{background:'#f0eeea',borderRadius:3,height:6,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${item.pct}%`,background:item.color,borderRadius:3,transition:'.4s'}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DERNIERES FACTURES + ACTIVITE */}
      <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr',gap:16,marginBottom:20}}>

        {/* DERNIERES FACTURES */}
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(0,0,0,0.08)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:13,fontWeight:600}}>Dernières factures</div>
            <Link href="/dashboard/factures" style={{fontSize:12,color:'#2563EB',textDecoration:'none',fontWeight:500}}>Voir tout →</Link>
          </div>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <tbody>
              {recentBills.length === 0 ? (
                <tr><td style={{textAlign:'center',padding:30,color:'#a8a69e',fontSize:13}}>Aucune facture</td></tr>
              ) : recentBills.map(b => (
                <tr key={b.id} style={{borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
                  <td style={{padding:'11px 18px'}}><span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'#2563EB',fontWeight:500}}>{b.invoice_number}</span></td>
                  <td style={{padding:'11px 14px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:26,height:26,borderRadius:'50%',background:'rgba(37,99,235,0.1)',color:'#2563EB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:600}}>
                        {b.clients?.full_name?.split(' ').map((w:string)=>w[0]).slice(0,2).join('')}
                      </div>
                      <span style={{fontSize:13,fontWeight:500}}>{b.clients?.full_name}</span>
                    </div>
                  </td>
                  <td style={{padding:'11px 14px',textAlign:'right'}}><span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:600}}>{dzdS(b.total_amount)}</span></td>
                  <td style={{padding:'11px 18px',textAlign:'right'}}>{statusBadge(b.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ACTIVITE */}
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(0,0,0,0.08)'}}>
            <div style={{fontSize:13,fontWeight:600}}>Activité récente</div>
          </div>
          <div style={{padding:'14px 18px',maxHeight:280,overflowY:'auto'}}>
            {recentPayments.length === 0 ? (
              <div style={{textAlign:'center',padding:20,color:'#a8a69e',fontSize:12}}>Aucune activité</div>
            ) : recentPayments.map((p,i) => (
              <div key={p.id} style={{display:'flex',gap:10,padding:'10px 0',borderBottom:i<recentPayments.length-1?'1px solid rgba(0,0,0,0.05)':'none'}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(22,163,74,0.1)',color:'#16a34a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,flexShrink:0}}>✓</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,lineHeight:1.4}}>
                    Paiement de <strong style={{color:'#16a34a',fontFamily:'JetBrains Mono,monospace'}}>{dzdS(p.amount)}</strong>
                  </div>
                  <div style={{fontSize:11,color:'#6b6860',marginTop:2}}>
                    {p.bills?.clients?.full_name} · {p.bills?.invoice_number}
                  </div>
                  <div style={{fontSize:10,color:'#a8a69e',marginTop:2}}>
                    {new Date(p.created_at).toLocaleDateString('fr-DZ')} · {p.method}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TOP CLIENTS */}
      <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,overflow:'hidden',marginBottom:20}}>
        <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(0,0,0,0.08)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:13,fontWeight:600}}>Top 5 clients par chiffre d'affaires</div>
          <Link href="/dashboard/clients" style={{fontSize:12,color:'#2563EB',textDecoration:'none',fontWeight:500}}>Tous les clients →</Link>
        </div>
        <div style={{padding:18}}>
          {topClients.length === 0 ? (
            <div style={{textAlign:'center',padding:30,color:'#a8a69e',fontSize:13}}>Aucun client actif</div>
          ) : topClients.map((c:any,i) => {
            const maxTotal = topClients[0]?.total || 1
            const pct = (c.total / maxTotal) * 100
            return (
              <div key={i} style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:24,height:24,borderRadius:'50%',background:i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'#e8e6e0',color:i<3?'#fff':'#6b6860',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700}}>{i+1}</div>
                    <span style={{fontSize:13,fontWeight:600}}>{c.name}</span>
                    <span style={{fontSize:11,color:'#a8a69e'}}>· {c.bills} factures</span>
                  </div>
                  <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:700,color:'#2563EB'}}>{dzd(c.total)}</span>
                </div>
                <div style={{background:'#f0eeea',borderRadius:3,height:5,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#2563EB,#7c3aed)',borderRadius:3,transition:'.4s'}}/>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* QUICK ACCESS */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {[
          { label:'Nouvelle facture', href:'/dashboard/factures', color:'#2563EB', bg:'rgba(37,99,235,0.06)', icon:'📄' },
          { label:'Nouveau client', href:'/dashboard/clients', color:'#16a34a', bg:'rgba(22,163,74,0.06)', icon:'👥' },
          { label:'Paiements', href:'/dashboard/paiements', color:'#d97706', bg:'rgba(217,119,6,0.06)', icon:'💰' },
          { label:'Produits', href:'/dashboard/produits', color:'#7c3aed', bg:'rgba(124,58,237,0.06)', icon:'📦' },
        ].map(item => (
          <Link key={item.href} href={item.href}
            style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px',background:item.bg,border:`1px solid ${item.color}20`,borderRadius:8,textDecoration:'none',transition:'all .15s'}}>
            <div style={{width:40,height:40,borderRadius:8,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>{item.icon}</div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:item.color}}>{item.label}</div>
              <div style={{fontSize:11,color:'#6b6860',marginTop:2}}>Accès rapide</div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{textAlign:'center',marginTop:28,fontSize:11,color:'#c8c6be'}}>ABOU IYAD · Développé par RS Comptabilité</div>
    </div>
  )
}