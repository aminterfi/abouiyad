'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useRealtime } from '@/lib/useRealtime'

function dzd(v: number) { return (v||0).toLocaleString('fr-DZ',{minimumFractionDigits:2})+' DZD' }
function dzdS(v: number) { return (v||0).toLocaleString('fr-DZ',{minimumFractionDigits:0})+' DZD' }
function formatShort(v: number) {
  if (v >= 1000000) return `${(v/1000000).toFixed(1)}M`
  if (v >= 1000) return `${Math.round(v/1000)}K`
  return Math.round(v).toString()
}

function RevenueChart({ monthly, labels }: { monthly: number[], labels: string[] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [animated, setAnimated] = useState(false)
  const max = Math.max(...monthly, 1)
  const maxScale = max * 1.2

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(timer)
  }, [monthly])

  const yTicks = 4
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => formatShort((maxScale / yTicks) * (yTicks - i)))

  return (
    <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.06)',borderRadius:16,padding:20,boxShadow:'0 1px 3px rgba(0,0,0,0.03)',overflow:'hidden'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:'#1a1916'}}>Chiffre d'affaires</div>
          <div style={{fontSize:11,color:'#a8a69e',marginTop:2}}>12 derniers mois</div>
        </div>
        <div style={{display:'flex',gap:10,fontSize:10,color:'#6b6860'}}>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <div style={{width:8,height:8,borderRadius:2,background:'#5B3DF5'}}/>Encaissé
          </div>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <div style={{width:8,height:8,borderRadius:2,background:'#8B7CF6',opacity:0.5}}/>Projection
          </div>
        </div>
      </div>

      {hovered !== null && (
        <div style={{background:'#1a1916',color:'#fff',padding:'8px 12px',borderRadius:8,fontSize:12,marginBottom:10,display:'inline-block',fontWeight:500,boxShadow:'0 4px 12px rgba(0,0,0,0.15)'}}>
          <span style={{opacity:0.7}}>{labels[hovered]} · </span>
          <strong style={{color:'#a78bfa'}}>+ {dzdS(monthly[hovered])}</strong>
        </div>
      )}

      <div style={{position:'relative',height:180,display:'flex',alignItems:'flex-end'}}>
        <div style={{display:'flex',flexDirection:'column',justifyContent:'space-between',height:'100%',paddingRight:8,paddingBottom:22}}>
          {yLabels.map((l, i) => (
            <div key={i} style={{fontSize:9,color:'#c8c6be',fontFamily:'JetBrains Mono,monospace',textAlign:'right'}}>{l}</div>
          ))}
        </div>

        <div style={{flex:1,position:'relative',height:'100%'}}>
          {yLabels.map((_, i) => (
            <div key={i} style={{position:'absolute',top:`${(i/yTicks)*(100-15)}%`,left:0,right:0,borderTop:'1px dashed rgba(0,0,0,0.05)',pointerEvents:'none'}}/>
          ))}

          <div style={{display:'flex',alignItems:'flex-end',gap:4,height:'100%',paddingBottom:22,position:'relative'}}>
            {monthly.map((val, i) => {
              const pctHeight = animated ? (val / maxScale) * 100 : 0
              const isHovered = hovered === i
              const isLast = i === monthly.length - 1
              return (
                <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6,height:'100%',justifyContent:'flex-end'}}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onTouchStart={() => setHovered(i)}>
                  <div style={{
                    width:'100%',maxWidth:24,height:`${pctHeight}%`,minHeight:val>0?4:0,
                    borderRadius:'6px 6px 0 0',
                    background:isLast?'linear-gradient(180deg, rgba(91,61,245,0.5), rgba(91,61,245,0.3))':'linear-gradient(180deg, #5B3DF5, #7c5cf5)',
                    transition:'all .8s cubic-bezier(.4,0,.2,1)',
                    cursor:'pointer',
                    transform:isHovered?'scaleY(1.02)':'scaleY(1)',
                    transformOrigin:'bottom',
                    boxShadow:isHovered?'0 4px 12px rgba(91,61,245,0.3)':'none',
                    position:'relative'
                  }}>
                    {isLast && (
                      <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.3) 3px, rgba(255,255,255,0.3) 6px)',borderRadius:'6px 6px 0 0'}}/>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{position:'absolute',bottom:0,left:0,right:0,display:'flex',gap:4}}>
            {labels.map((l, i) => (
              <div key={i} style={{flex:1,fontSize:9,color:'#a8a69e',textAlign:'center',fontWeight:500}}>{l.slice(0,3)}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, color, icon, trend, isMobile }: any) {
  return (
    <div style={{
      background:'#fff',
      border:'1px solid rgba(0,0,0,0.05)',
      borderRadius:16,padding:18,
      minWidth:isMobile?'75%':0,
      flexShrink:0,
      scrollSnapAlign:'start',
      boxShadow:'0 1px 3px rgba(0,0,0,0.03)',
      position:'relative',
      overflow:'hidden'
    }}>
      <div style={{position:'absolute',top:16,right:16,width:36,height:36,borderRadius:10,background:`${color}10`,display:'flex',alignItems:'center',justifyContent:'center',color}}>{icon}</div>
      <div style={{fontSize:11,color:'#a8a69e',fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px',marginBottom:8}}>{label}</div>
      <div style={{fontSize:24,fontWeight:700,color,fontFamily:'JetBrains Mono,monospace',lineHeight:1.1,marginBottom:6}}>{value}</div>
      <div style={{fontSize:11,color:'#a8a69e',display:'flex',alignItems:'center',gap:4}}>
        {trend !== undefined && trend !== 0 && <span style={{color:trend>0?'#16a34a':'#dc2626',fontWeight:700}}>{trend>0?'↑':'↓'} {Math.abs(trend)}%</span>}
        <span>{sub}</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [data, setData] = useState<any>({
    caPeriod: 0, caPrev: 0, clientsTotal: 0, clientsNew: 0,
    impaye: 0, factPending: 0, taux: 0,
    factures: 0, partielles: 0, impayees: 0, payees: 0,
    caTotal: 0, encaisseTotal: 0, paiementsCount: 0, ticketMoyen: 0,
  })
  const [recentBills, setRecentBills] = useState<any[]>([])
  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const [monthlyRev, setMonthlyRev] = useState<number[]>([])
  const [monthlyLabels, setMonthlyLabels] = useState<string[]>([])
  const [topClients, setTopClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('mois')
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    setUser(JSON.parse(u))
    fetchAll()
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [period])

  useRealtime(['bills', 'payments', 'clients', 'products', 'bill_items'], fetchAll)

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

    const [{ data: allBills },{ data: allPayments },{ data: allClients },{ data: recentBs },{ data: recentPs }] = await Promise.all([
      supabase.from('bills').select('*, clients(full_name)').eq('is_archived', false),
      supabase.from('payments').select('*'),
      supabase.from('clients').select('*').eq('is_archived', false),
      supabase.from('bills').select('*, clients(full_name)').eq('is_archived', false).order('created_at', { ascending: false }).limit(3),
      supabase.from('payments').select('*, bills(invoice_number, clients(full_name))').order('created_at', { ascending: false }).limit(3)
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
    for (let i = 11; i >= 0; i--) {
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
      if (!clientStats[b.client_id]) clientStats[b.client_id] = { name: b.clients?.full_name, total: 0, bills: 0 }
      clientStats[b.client_id].total += b.total_amount
      clientStats[b.client_id].bills++
    })
    const tops = Object.values(clientStats).sort((a:any,b:any) => b.total - a.total).slice(0, 3)

    setData({
      caPeriod, caPrev,
      clientsTotal: (allClients||[]).length,
      clientsNew: periodClients.length,
      impaye, factPending, taux,
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
    setLoading(false)
  }

  if (loading) return (
    <div style={{padding:16}}>
      <style>{`
        @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
      `}</style>
      {[1,2,3].map(i => (
        <div key={i} style={{height:80,borderRadius:12,marginBottom:12,border:'1px solid rgba(0,0,0,0.05)',background:'linear-gradient(90deg, #f0eeea 0%, #f8f7f5 50%, #f0eeea 100%)',backgroundSize:'200% 100%',animation:'shimmer 1.5s infinite'}}/>
      ))}
    </div>
  )

  const caEvolution = data.caPrev > 0 ? Math.round(((data.caPeriod - data.caPrev) / data.caPrev) * 100) : 0
  const totalBills = data.payees + data.partielles + data.impayees || 1

  const statusBadge = (s: string) => {
    if (s === 'payé') return <span style={{background:'rgba(22,163,74,0.1)',color:'#15803d',fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:20}}>Payé</span>
    if (s === 'partiel') return <span style={{background:'rgba(217,119,6,0.1)',color:'#b45309',fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:20}}>Partiel</span>
    return <span style={{background:'rgba(220,38,38,0.08)',color:'#dc2626',fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:20}}>Impayé</span>
  }

  const kpiScrollStyle: React.CSSProperties = isMobile
    ? { display:'flex', gap:12, marginBottom:20, overflowX:'auto', scrollSnapType:'x mandatory', margin:'0 -16px 20px', padding:'0 16px' }
    : { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }

  return (
    <div style={{maxWidth:'100%',overflow:'hidden'}}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div style={{marginBottom:20}}>
        <div style={{fontSize:isMobile?22:24,fontWeight:800,letterSpacing:'-.5px',color:'#1a1916'}}>Tableau de bord</div>
        <div style={{fontSize:13,color:'#a8a69e',marginTop:3,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
          <span>Bonjour <strong style={{color:'#1a1916'}}>{user?.full_name?.split(' ')[0]}</strong></span>
          <span style={{color:'#c8c6be'}}>·</span>
          <span>{new Date().toLocaleDateString('fr-DZ',{day:'numeric',month:'long'})}</span>
          <span style={{display:'inline-flex',alignItems:'center',gap:4,marginLeft:'auto',fontSize:10,color:'#16a34a',fontWeight:600}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#16a34a',animation:'pulse 2s infinite'}}/>
            Temps réel
          </span>
        </div>
      </div>

      <div style={{background:'#f0eeea',borderRadius:12,padding:4,display:'flex',marginBottom:20}}>
        {[{v:'semaine',l:'Semaine'},{v:'mois',l:'Mois'},{v:'annee',l:'Année'}].map(p=>(
          <button key={p.v} onClick={()=>setPeriod(p.v)}
            style={{
              flex:1,padding:'10px',borderRadius:9,fontSize:13,cursor:'pointer',border:'none',
              fontFamily:'inherit',fontWeight:period===p.v?600:500,
              background:period===p.v?'#2563EB':'transparent',
              color:period===p.v?'#fff':'#6b6860',
              transition:'all .2s cubic-bezier(.4,0,.2,1)',
              boxShadow:period===p.v?'0 2px 8px rgba(37,99,235,0.25)':'none'
            }}>{p.l}</button>
        ))}
      </div>

      <div className="hide-scrollbar" style={kpiScrollStyle}>
        <KpiCard isMobile={isMobile}
          label={`CA ${period}`}
          value={dzdS(data.caPeriod)}
          color="#16a34a"
          trend={caEvolution}
          sub="vs préc."
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
        />
        <KpiCard isMobile={isMobile}
          label="Clients"
          value={data.clientsTotal}
          color="#2563EB"
          sub={data.clientsNew > 0 ? `+${data.clientsNew} nouveaux` : 'Total actifs'}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
        />
        <KpiCard isMobile={isMobile}
          label="Impayés"
          value={dzdS(data.impaye)}
          color="#d97706"
          sub={`${data.factPending} factures`}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
        />
        <KpiCard isMobile={isMobile}
          label="Recouvrement"
          value={`${data.taux}%`}
          color="#7c3aed"
          sub={data.taux>70?'Excellent':data.taux>40?'Correct':'À améliorer'}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
        />
      </div>

      <div style={{marginBottom:20}}>
        <RevenueChart monthly={monthlyRev} labels={monthlyLabels} />
      </div>

      <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.05)',borderRadius:16,padding:20,marginBottom:20,boxShadow:'0 1px 3px rgba(0,0,0,0.03)'}}>
        <div style={{fontSize:15,fontWeight:700,marginBottom:4,color:'#1a1916'}}>État des factures</div>
        <div style={{fontSize:11,color:'#a8a69e',marginBottom:16}}>{totalBills} factures au total</div>
        {[
          { label:'Payées', pct:Math.round((data.payees/totalBills)*100), count:data.payees, color:'#16a34a' },
          { label:'Partielles', pct:Math.round((data.partielles/totalBills)*100), count:data.partielles, color:'#d97706' },
          { label:'Impayées', pct:Math.round((data.impayees/totalBills)*100), count:data.impayees, color:'#dc2626' },
        ].map(item => (
          <div key={item.label} style={{marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:6}}>
              <span style={{color:'#6b6860',fontWeight:500}}>● {item.label}</span>
              <span><span style={{color:item.color,fontWeight:700}}>{item.pct}%</span> <span style={{color:'#a8a69e',fontSize:11}}>· {item.count}</span></span>
            </div>
            <div style={{background:'#f0eeea',borderRadius:4,height:8,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${item.pct}%`,background:item.color,borderRadius:4,transition:'width .8s cubic-bezier(.4,0,.2,1)'}}/>
            </div>
          </div>
        ))}
      </div>

      <div style={{marginBottom:20}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:12,color:'#1a1916',paddingLeft:4}}>Actions rapides</div>
        <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:10}}>
          {[
            { label:'Nouvelle facture', href:'/dashboard/factures', color:'#2563EB', icon:'📄' },
            { label:'Nouveau client', href:'/dashboard/clients', color:'#16a34a', icon:'👥' },
            { label:'Encaisser', href:'/dashboard/factures', color:'#d97706', icon:'💰' },
            { label:'Produits', href:'/dashboard/produits', color:'#7c3aed', icon:'📦' },
          ].map(item => (
            <Link key={item.label} href={item.href}
              style={{
                display:'flex',flexDirection:isMobile?'row':'column',alignItems:'center',gap:isMobile?12:8,
                padding:isMobile?'16px':'18px 12px',
                background:'#fff',
                border:'1px solid rgba(0,0,0,0.05)',
                borderRadius:12,textDecoration:'none',
                boxShadow:'0 1px 3px rgba(0,0,0,0.03)',
                transition:'transform .15s'
              }}>
              <div style={{width:40,height:40,borderRadius:10,background:`${item.color}10`,color:item.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{item.icon}</div>
              <div style={{fontSize:13,fontWeight:600,color:'#1a1916',textAlign:isMobile?'left':'center'}}>{item.label}</div>
            </Link>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:16,marginBottom:20}}>
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.05)',borderRadius:16,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.03)'}}>
          <div style={{padding:'16px 18px',borderBottom:'1px solid rgba(0,0,0,0.05)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:14,fontWeight:700}}>Dernières factures</div>
            <Link href="/dashboard/factures" style={{fontSize:11,color:'#2563EB',textDecoration:'none',fontWeight:600}}>Tout voir →</Link>
          </div>
          <div>
            {recentBills.length === 0 ? (
              <div style={{textAlign:'center',padding:30,color:'#a8a69e',fontSize:13}}>
                <div style={{fontSize:30,marginBottom:8}}>📄</div>
                Aucune facture
              </div>
            ) : recentBills.map((b,i) => (
              <Link key={b.id} href="/dashboard/factures"
                style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px',borderBottom:i<recentBills.length-1?'1px solid rgba(0,0,0,0.04)':'none',textDecoration:'none',color:'inherit'}}>
                <div style={{width:36,height:36,borderRadius:10,background:'rgba(37,99,235,0.08)',color:'#2563EB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0}}>
                  {b.clients?.full_name?.split(' ').map((w:string)=>w[0]).slice(0,2).join('')}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.clients?.full_name}</div>
                  <div style={{fontSize:10,color:'#a8a69e',fontFamily:'JetBrains Mono,monospace',marginTop:2}}>{b.invoice_number}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:13,fontWeight:700,fontFamily:'JetBrains Mono,monospace'}}>{dzdS(b.total_amount)}</div>
                  <div style={{marginTop:3}}>{statusBadge(b.status)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.05)',borderRadius:16,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.03)'}}>
          <div style={{padding:'16px 18px',borderBottom:'1px solid rgba(0,0,0,0.05)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:14,fontWeight:700}}>Derniers paiements</div>
            <Link href="/dashboard/paiements" style={{fontSize:11,color:'#2563EB',textDecoration:'none',fontWeight:600}}>Tout voir →</Link>
          </div>
          <div>
            {recentPayments.length === 0 ? (
              <div style={{textAlign:'center',padding:30,color:'#a8a69e',fontSize:13}}>
                <div style={{fontSize:30,marginBottom:8}}>💰</div>
                Aucun paiement
              </div>
            ) : recentPayments.map((p,i) => (
              <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px',borderBottom:i<recentPayments.length-1?'1px solid rgba(0,0,0,0.04)':'none'}}>
                <div style={{width:36,height:36,borderRadius:10,background:'rgba(22,163,74,0.1)',color:'#16a34a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700,flexShrink:0}}>✓</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.bills?.clients?.full_name||'—'}</div>
                  <div style={{fontSize:10,color:'#a8a69e',marginTop:2}}>{p.method} · {new Date(p.created_at).toLocaleDateString('fr-DZ')}</div>
                </div>
                <div style={{fontSize:13,fontWeight:700,fontFamily:'JetBrains Mono,monospace',color:'#16a34a'}}>+{dzdS(p.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {topClients.length > 0 && (
        <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.05)',borderRadius:16,overflow:'hidden',marginBottom:20,boxShadow:'0 1px 3px rgba(0,0,0,0.03)'}}>
          <div style={{padding:'16px 18px',borderBottom:'1px solid rgba(0,0,0,0.05)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:14,fontWeight:700}}>🏆 Meilleurs clients</div>
            <Link href="/dashboard/clients" style={{fontSize:11,color:'#2563EB',textDecoration:'none',fontWeight:600}}>Tous →</Link>
          </div>
          <div style={{padding:18}}>
            {topClients.map((c:any,i) => {
              const maxTotal = topClients[0]?.total || 1
              const pct = (c.total / maxTotal) * 100
              return (
                <div key={i} style={{marginBottom:i<topClients.length-1?14:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0,flex:1}}>
                      <div style={{width:24,height:24,borderRadius:'50%',background:i===0?'#ffd700':i===1?'#c0c0c0':'#cd7f32',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,flexShrink:0}}>{i+1}</div>
                      <span style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</span>
                    </div>
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:700,color:'#5B3DF5',flexShrink:0}}>{dzdS(c.total)}</span>
                  </div>
                  <div style={{background:'#f0eeea',borderRadius:3,height:5,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#5B3DF5,#8B7CF6)',borderRadius:3,transition:'width .8s cubic-bezier(.4,0,.2,1)'}}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{textAlign:'center',marginTop:24,marginBottom:8,fontSize:10,color:'#c8c6be'}}>
        ABOU IYAD · Développé par RS Comptabilité
      </div>
    </div>
  )
}