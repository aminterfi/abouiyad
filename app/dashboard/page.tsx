'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function dzd(v: number) { return (v||0).toLocaleString('fr-DZ',{minimumFractionDigits:2})+' DZD' }
function dzdS(v: number) { return (v||0).toLocaleString('fr-DZ',{minimumFractionDigits:0})+' DZD' }

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [data, setData] = useState<any>({
    caPeriod: 0, caPrev: 0, clientsTotal: 0, clientsNew: 0,
    impaye: 0, factPending: 0, taux: 0, tauxPrev: 0,
    factures: 0, partielles: 0, impayees: 0, payees: 0,
    caTotal: 0, encaisseTotal: 0, paiementsCount: 0, ticketMoyen: 0,
  })
  const [recentBills, setRecentBills] = useState<any[]>([])
  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const [monthlyRev, setMonthlyRev] = useState<number[]>([])
  const [monthlyLabels, setMonthlyLabels] = useState<string[]>([])
  const [topClients, setTopClients] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [methodsStats, setMethodsStats] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('mois')
  const router = useRouter()

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    setUser(JSON.parse(u))
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [period])

  async function fetchAll() {
    const now = new Date()
    let startDate: Date, prevStart: Date, prevEnd: Date
    if (period === 'semaine') {
      startDate = new Date(now.getTime() - 7*86400000)
      prevStart = new Date(now.getTime() - 14*86400000)
      prevEnd = startDate
    } else if (period === 'mois') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      prevStart = new Date(now.getFullYear(), now.getMonth()-1, 1)
      prevEnd = startDate
    } else {
      startDate = new Date(now.getFullYear(), 0, 1)
      prevStart = new Date(now.getFullYear()-1, 0, 1)
      prevEnd = startDate
    }

    const [
      { data: allBills },
      { data: allPayments },
      { data: allClients },
      { data: billItems },
      { data: recentBs },
      { data: recentPs }
    ] = await Promise.all([
      supabase.from('bills').select('*, clients(full_name)').eq('is_archived', false),
      supabase.from('payments').select('*'),
      supabase.from('clients').select('*').eq('is_archived', false),
      supabase.from('bill_items').select('*, products(name)'),
      supabase.from('bills').select('*, clients(full_name)').eq('is_archived', false).order('created_at', { ascending: false }).limit(6),
      supabase.from('payments').select('*, bills(invoice_number, clients(full_name))').order('created_at', { ascending: false }).limit(6)
    ])

    const bills = allBills || []
    const payments = allPayments || []
    const periodPayments = payments.filter((p:any) => new Date(p.created_at) >= startDate)
    const caPeriod = periodPayments.reduce((s,p:any) => s + p.amount, 0)
    const prevPayments = payments.filter((p:any) => {
      const d = new Date(p.created_at)
      return d >= prevStart && d < prevEnd
    })
    const caPrev = prevPayments.reduce((s,p:any) => s + p.amount, 0)
    const periodClients = (allClients||[]).filter((c:any) => new Date(c.created_at) >= startDate)
    const caTotal = bills.reduce((s,b:any) => s + (b.total_amount||0), 0)
    const encaisseTotal = bills.reduce((s,b:any) => s + (b.paid_amount||0), 0)
    const impaye = caTotal - encaisseTotal
    const taux = caTotal > 0 ? Math.round((encaisseTotal / caTotal) * 100) : 0
    const factPending = bills.filter((b:any) => b.status !== 'payé').length
    const partielles = bills.filter((b:any) => b.status === 'partiel').length
    const impayees = bills.filter((b:any) => b.status === 'impayé').length
    const payees = bills.filter((b:any) => b.status === 'payé').length

    const monthly: number[] = []
    const labels: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const m = payments.filter((p:any) => {
        const pd = new Date(p.created_at)
        return pd >= d && pd < next
      }).reduce((s,p:any) => s + p.amount, 0)
      monthly.push(m)
      labels.push(d.toLocaleDateString('fr-DZ', { month: 'short' }))
    }

    const clientStats: Record<string, any> = {}
    bills.forEach((b:any) => {
      if (!b.client_id) return
      if (!clientStats[b.client_id]) clientStats[b.client_id] = { name: b.clients?.full_name, total: 0, paid: 0, bills: 0 }
      clientStats[b.client_id].total += b.total_amount
      clientStats[b.client_id].paid += b.paid_amount
      clientStats[b.client_id].bills++
    })
    const tops = Object.values(clientStats).sort((a:any,b:any) => b.total - a.total).slice(0, 5)

    const productStats: Record<string, any> = {}
    ;(billItems || []).forEach((i:any) => {
      if (!i.product_id) return
      if (!productStats[i.product_id]) productStats[i.product_id] = { name: i.products?.name, qty: 0, total: 0, count: 0 }
      productStats[i.product_id].qty += i.quantity
      productStats[i.product_id].total += i.total
      productStats[i.product_id].count++
    })
    const topP = Object.values(productStats).sort((a:any,b:any) => b.total - a.total).slice(0, 5)

    const methStats: Record<string, any> = {}
    payments.forEach((p:any) => {
      if (!p.method) return
      if (!methStats[p.method]) methStats[p.method] = { name: p.method, count: 0, total: 0 }
      methStats[p.method].count++
      methStats[p.method].total += p.amount
    })
    const methods = Object.values(methStats).sort((a:any,b:any) => b.total - a.total)

    const alerts: any[] = []
    const overdueBills = bills.filter((b:any) => {
      if (b.status === 'payé') return false
      const age = (now.getTime() - new Date(b.created_at).getTime()) / 86400000
      return age > 30
    })
    if (overdueBills.length > 0) {
      alerts.push({ type: 'danger', icon: '⚠️', label: `${overdueBills.length} facture(s) en retard (+30j)`, amount: overdueBills.reduce((s,b:any)=>s+(b.total_amount-b.paid_amount), 0) })
    }
    if (impaye > caTotal * 0.3 && caTotal > 0) {
      alerts.push({ type: 'warning', icon: '⚡', label: `Taux d'impayés élevé (${Math.round(impaye/caTotal*100)}%)`, amount: impaye })
    }
    if (impayees > 0) {
      alerts.push({ type: 'info', icon: 'ℹ️', label: `${impayees} facture(s) impayée(s) à relancer`, amount: bills.filter((b:any)=>b.status==='impayé').reduce((s,b:any)=>s+b.total_amount, 0) })
    }

    setData({
      caPeriod, caPrev,
      clientsTotal: (allClients||[]).length,
      clientsNew: periodClients.length,
      impaye, factPending, taux,
      tauxPrev: caPrev > 0 ? Math.round((caPrev / (caPrev + impaye)) * 100) : 0,
      factures: bills.length, partielles, impayees, payees,
      caTotal, encaisseTotal,
      paiementsCount: payments.length,
      ticketMoyen: payments.length ? encaisseTotal / payments.length : 0,
    })
    setRecentBills(recentBs || [])
    setRecentPayments(recentPs || [])
    setMonthlyRev(monthly)
    setMonthlyLabels(labels)
    setTopClients(tops)
    setTopProducts(topP)
    setMethodsStats(methods)
    setAlerts(alerts)
    setLoading(false)
  }

  if (loading) return <div style={{textAlign:'center',padding:60,color:'#a8a69e'}}>Chargement...</div>

  const maxRev = Math.max(...monthlyRev, 1)
  const totalBills = data.payees + data.partielles + data.impayees || 1
  const caEvolution = data.caPrev > 0 ? Math.round(((data.caPeriod - data.caPrev) / data.caPrev) * 100) : 0

  const statusBadge = (s: string) => {
    if (s === 'payé') return <span style={{background:'rgba(22,163,74,0.1)',color:'#15803d',border:'1px solid rgba(22,163,74,0.2)',fontSize:11,fontWeight:600,padding:'2px 9px',borderRadius:20}}>● Payé</span>
    if (s === 'partiel') return <span style={{background:'rgba(217,119,6,0.1)',color:'#b45309',border:'1px solid rgba(217,119,6,0.2)',fontSize:11,fontWeight:600,padding:'2px 9px',borderRadius:20}}>◐ Partiel</span>
    return <span style={{background:'rgba(220,38,38,0.08)',color:'#dc2626',border:'1px solid rgba(220,38,38,0.15)',fontSize:11,fontWeight:600,padding:'2px 9px',borderRadius:20}}>○ Impayé</span>
  }

  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:18,fontWeight:700,letterSpacing:'-.3px'}}>Tableau de bord</div>
          <div style={{fontSize:12,color:'#a8a69e',marginTop:3}}>
            Bonjour <strong>{user?.full_name?.split(' ')[0]}</strong> · {new Date().toLocaleDateString('fr-DZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
            <span style={{marginLeft:10,fontSize:10,color:'#16a34a'}}>● Données en temps réel</span>
          </div>
        </div>
        <div style={{display:'flex',gap:6}}>
          {[{v:'semaine',l:'Semaine'},{v:'mois',l:'Mois'},{v:'annee',l:'Année'}].map(p=>(
            <button key={p.v} onClick={()=>setPeriod(p.v)}
              style={{padding:'7px 14px',borderRadius:5,fontSize:12,cursor:'pointer',border:'1px solid rgba(0,0,0,0.14)',fontFamily:'inherit',background:period===p.v?'#2563EB':'#fff',color:period===p.v?'#fff':'#6b6860',fontWeight:500,transition:'all .15s'}}>{p.l}</button>
          ))}
        </div>
      </div>

      {alerts.length > 0 && (
        <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(alerts.length,3)},1fr)`,gap:10,marginBottom:18}}>
          {alerts.map((a:any,i) => (
            <div key={i} style={{padding:'12px 16px',borderRadius:8,background:a.type==='danger'?'rgba(220,38,38,0.06)':a.type==='warning'?'rgba(217,119,6,0.06)':'rgba(37,99,235,0.05)',border:`1px solid ${a.type==='danger'?'rgba(220,38,38,0.2)':a.type==='warning'?'rgba(217,119,6,0.2)':'rgba(37,99,235,0.15)'}`,display:'flex',alignItems:'center',gap:12}}>
              <div style={{fontSize:22}}>{a.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:a.type==='danger'?'#dc2626':a.type==='warning'?'#d97706':'#2563EB'}}>{a.label}</div>
                <div style={{fontSize:11,color:'#6b6860',fontFamily:'JetBrains Mono,monospace',marginTop:2}}>{dzdS(a.amount)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,padding:'16px 18px',borderLeft:'3px solid #16a34a'}}>
          <div style={{fontSize:10,color:'#a8a69e',fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px',marginBottom:6}}>Chiffre d'affaires ({period})</div>
          <div style={{fontSize:22,fontWeight:700,color:'#16a34a',fontFamily:'JetBrains Mono,monospace'}}>{dzdS(data.caPeriod)}</div>
          <div style={{fontSize:11,color:'#a8a69e',marginTop:4,display:'flex',alignItems:'center',gap:4}}>
            {caEvolution !== 0 && <span style={{color:caEvolution>0?'#16a34a':'#dc2626',fontWeight:600}}>{caEvolution>0?'↑':'↓'} {Math.abs(caEvolution)}%</span>}
            <span>vs période préc.</span>
          </div>
        </div>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,padding:'16px 18px',borderLeft:'3px solid #2563EB'}}>
          <div style={{fontSize:10,color:'#a8a69e',fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px',marginBottom:6}}>Clients</div>
          <div style={{fontSize:22,fontWeight:700}}>{data.clientsTotal}</div>
          <div style={{fontSize:11,color:'#a8a69e',marginTop:4}}>{data.clientsNew > 0 ? <><span style={{color:'#16a34a',fontWeight:600}}>+{data.clientsNew}</span> cette période</> : 'Aucun nouveau'}</div>
        </div>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,padding:'16px 18px',borderLeft:'3px solid #d97706'}}>
          <div style={{fontSize:10,color:'#a8a69e',fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px',marginBottom:6}}>Impayés</div>
          <div style={{fontSize:22,fontWeight:700,color:'#d97706',fontFamily:'JetBrains Mono,monospace'}}>{dzdS(data.impaye)}</div>
          <div style={{fontSize:11,color:'#a8a69e',marginTop:4}}>{data.factPending} factures en attente</div>
        </div>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,padding:'16px 18px',borderLeft:'3px solid #7c3aed'}}>
          <div style={{fontSize:10,color:'#a8a69e',fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px',marginBottom:6}}>Taux recouvrement</div>
          <div style={{fontSize:22,fontWeight:700}}>{data.taux}%</div>
          <div style={{background:'#f0eeea',borderRadius:3,height:4,marginTop:6,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${data.taux}%`,background:data.taux>70?'#16a34a':data.taux>40?'#d97706':'#dc2626',transition:'.4s'}}/>
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        {[
          { label:'CA Total historique', val:dzdS(data.caTotal), color:'#1a1916' },
          { label:'Total encaissé', val:dzdS(data.encaisseTotal), color:'#16a34a' },
          { label:'Paiements reçus', val:data.paiementsCount, color:'#2563EB' },
          { label:'Ticket moyen', val:dzdS(data.ticketMoyen), color:'#7c3aed' },
        ].map((s,i) => (
          <div key={i} style={{background:'rgba(255,255,255,0.6)',border:'1px solid rgba(0,0,0,0.05)',borderRadius:8,padding:'12px 16px'}}>
            <div style={{fontSize:10,color:'#a8a69e',fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px',marginBottom:4}}>{s.label}</div>
            <div style={{fontSize:15,fontWeight:700,color:s.color,fontFamily:'JetBrains Mono,monospace'}}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:16,marginBottom:20}}>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(0,0,0,0.08)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:13,fontWeight:600}}>Évolution des revenus</div>
              <div style={{fontSize:11,color:'#a8a69e',marginTop:2}}>6 derniers mois · Paiements encaissés</div>
            </div>
            <div style={{fontSize:11,color:'#16a34a',fontWeight:600,fontFamily:'JetBrains Mono,monospace'}}>Total : {dzdS(monthlyRev.reduce((s,v)=>s+v,0))}</div>
          </div>
          <div style={{padding:'20px 18px'}}>
            <div style={{display:'flex',alignItems:'flex-end',gap:10,height:160}}>
              {monthlyRev.map((val,i) => {
                const h = val > 0 ? Math.max((val/maxRev)*100, 5) : 2
                const isCurrent = i === monthlyRev.length - 1
                return (
                  <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
                    <div style={{fontSize:9,color:'#a8a69e',fontFamily:'JetBrains Mono,monospace',fontWeight:600,minHeight:12}}>{val > 0 ? dzdS(val).replace(' DZD','') : ''}</div>
                    <div style={{width:'100%',height:`${h}%`,borderRadius:'4px 4px 0 0',background:isCurrent?'linear-gradient(180deg,#2563EB,#1d4ed8)':'rgba(37,99,235,0.5)',transition:'.4s'}} title={`${monthlyLabels[i]}: ${dzd(val)}`}/>
                    <span style={{fontSize:10,color:'#a8a69e',marginTop:2,fontWeight:500,textTransform:'capitalize'}}>{monthlyLabels[i]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(0,0,0,0.08)'}}>
            <div style={{fontSize:13,fontWeight:600}}>État des factures</div>
            <div style={{fontSize:11,color:'#a8a69e',marginTop:2}}>Répartition sur {totalBills} factures</div>
          </div>
          <div style={{padding:18}}>
            {[
              { label:'Payées', pct:Math.round((data.payees/totalBills)*100), count:data.payees, color:'#16a34a' },
              { label:'Partielles', pct:Math.round((data.partielles/totalBills)*100), count:data.partielles, color:'#d97706' },
              { label:'Impayées', pct:Math.round((data.impayees/totalBills)*100), count:data.impayees, color:'#dc2626' },
            ].map(item => (
              <div key={item.label} style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5,alignItems:'center'}}>
                  <span style={{color:'#6b6860',fontWeight:500}}>● {item.label}</span>
                  <span><span style={{color:item.color,fontWeight:700}}>{item.pct}%</span> <span style={{color:'#a8a69e',fontSize:11}}>· {item.count}</span></span>
                </div>
                <div style={{background:'#f0eeea',borderRadius:3,height:7,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${item.pct}%`,background:item.color,borderRadius:3,transition:'.4s'}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:16,marginBottom:20}}>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,overflow:'hidden'}}>
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

        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(0,0,0,0.08)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:13,fontWeight:600}}>Derniers paiements</div>
            <Link href="/dashboard/paiements" style={{fontSize:12,color:'#2563EB',textDecoration:'none',fontWeight:500}}>Voir tout →</Link>
          </div>
          <div style={{padding:'14px 18px',maxHeight:320,overflowY:'auto'}}>
            {recentPayments.length === 0 ? (
              <div style={{textAlign:'center',padding:20,color:'#a8a69e',fontSize:12}}>Aucun paiement</div>
            ) : recentPayments.map((p,i) => (
              <div key={p.id} style={{display:'flex',gap:10,padding:'10px 0',borderBottom:i<recentPayments.length-1?'1px solid rgba(0,0,0,0.05)':'none'}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(22,163,74,0.1)',color:'#16a34a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,flexShrink:0}}>✓</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500}}>
                    <strong style={{color:'#16a34a',fontFamily:'JetBrains Mono,monospace'}}>+{dzdS(p.amount)}</strong>
                  </div>
                  <div style={{fontSize:11,color:'#6b6860',marginTop:2}}>{p.bills?.clients?.full_name} · {p.bills?.invoice_number}</div>
                  <div style={{fontSize:10,color:'#a8a69e',marginTop:2}}>{new Date(p.created_at).toLocaleDateString('fr-DZ')} · {p.method}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(0,0,0,0.08)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:13,fontWeight:600}}>🏆 Top clients</div>
            <Link href="/dashboard/clients" style={{fontSize:12,color:'#2563EB',textDecoration:'none',fontWeight:500}}>Tous →</Link>
          </div>
          <div style={{padding:18}}>
            {topClients.length === 0 ? (
              <div style={{textAlign:'center',padding:20,color:'#a8a69e',fontSize:13}}>Aucun client</div>
            ) : topClients.map((c:any,i) => {
              const maxTotal = topClients[0]?.total || 1
              const pct = (c.total / maxTotal) * 100
              return (
                <div key={i} style={{marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:22,height:22,borderRadius:'50%',background:i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'#e8e6e0',color:i<3?'#fff':'#6b6860',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700}}>{i+1}</div>
                      <span style={{fontSize:13,fontWeight:600}}>{c.name}</span>
                    </div>
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:700,color:'#2563EB'}}>{dzdS(c.total)}</span>
                  </div>
                  <div style={{background:'#f0eeea',borderRadius:3,height:5,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#2563EB,#7c3aed)',borderRadius:3,transition:'.4s'}}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(0,0,0,0.08)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:13,fontWeight:600}}>📦 Top produits</div>
            <Link href="/dashboard/produits" style={{fontSize:12,color:'#2563EB',textDecoration:'none',fontWeight:500}}>Tous →</Link>
          </div>
          <div style={{padding:18}}>
            {topProducts.length === 0 ? (
              <div style={{textAlign:'center',padding:20,color:'#a8a69e',fontSize:13}}>Aucun produit vendu</div>
            ) : topProducts.map((p:any,i) => {
              const maxTotal = topProducts[0]?.total || 1
              const pct = (p.total / maxTotal) * 100
              return (
                <div key={i} style={{marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                      <div style={{fontSize:10,color:'#a8a69e',marginTop:1}}>{p.qty} unités · {p.count} factures</div>
                    </div>
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:700,color:'#16a34a'}}>{dzdS(p.total)}</span>
                  </div>
                  <div style={{background:'#f0eeea',borderRadius:3,height:5,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#16a34a,#0d9488)',borderRadius:3,transition:'.4s'}}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(0,0,0,0.08)'}}>
            <div style={{fontSize:13,fontWeight:600}}>💳 Méthodes de paiement</div>
          </div>
          <div style={{padding:18}}>
            {methodsStats.length === 0 ? (
              <div style={{textAlign:'center',padding:20,color:'#a8a69e',fontSize:13}}>Aucun paiement</div>
            ) : methodsStats.map((m:any,i) => {
              const maxTotal = methodsStats[0]?.total || 1
              const pct = (m.total / maxTotal) * 100
              const colors = ['#2563EB','#7c3aed','#16a34a','#d97706','#dc2626','#0d9488']
              return (
                <div key={i} style={{marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                    <span style={{fontSize:13,fontWeight:500}}>{m.name}</span>
                    <span>
                      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:700,color:colors[i]}}>{dzdS(m.total)}</span>
                      <span style={{fontSize:10,color:'#a8a69e',marginLeft:6}}>· {m.count} paiements</span>
                    </span>
                  </div>
                  <div style={{background:'#f0eeea',borderRadius:3,height:5,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:colors[i],borderRadius:3,transition:'.4s'}}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(0,0,0,0.08)'}}>
            <div style={{fontSize:13,fontWeight:600}}>⚡ Actions rapides</div>
          </div>
          <div style={{padding:18,display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {[
              { label:'Nouvelle facture', href:'/dashboard/factures', color:'#2563EB', icon:'📄' },
              { label:'Nouveau client', href:'/dashboard/clients', color:'#16a34a', icon:'👥' },
              { label:'Encaisser un paiement', href:'/dashboard/factures', color:'#d97706', icon:'💰' },
              { label:'Voir les produits', href:'/dashboard/produits', color:'#7c3aed', icon:'📦' },
            ].map(item => (
              <Link key={item.href} href={item.href}
                style={{display:'flex',alignItems:'center',gap:10,padding:'14px',background:`${item.color}08`,border:`1px solid ${item.color}25`,borderRadius:8,textDecoration:'none',transition:'all .15s'}}>
                <div style={{width:36,height:36,borderRadius:8,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0,boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>{item.icon}</div>
                <div style={{fontSize:12,fontWeight:600,color:item.color}}>{item.label}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div style={{textAlign:'center',marginTop:20,fontSize:11,color:'#c8c6be'}}>
        ABOU IYAD · Développé par RS Comptabilité
      </div>
    </div>
  )
}