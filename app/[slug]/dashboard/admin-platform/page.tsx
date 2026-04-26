'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

function dzd(v:number){return (v||0).toLocaleString('fr-DZ',{minimumFractionDigits:0})+' DZD'}

const STATUS_BADGES: Record<string, {bg:string,color:string,label:string}> = {
  trial: {bg:'rgba(217,119,6,0.1)', color:'#d97706', label:'Trial'},
  active: {bg:'rgba(22,163,74,0.1)', color:'#16a34a', label:'Actif'},
  suspended: {bg:'rgba(220,38,38,0.1)', color:'#dc2626', label:'Suspendu'},
  expired: {bg:'rgba(107,104,96,0.1)', color:'#6b6860', label:'Expiré'},
  no_sub: {bg:'rgba(107,104,96,0.1)', color:'#6b6860', label:'Sans abonnement'},
}

export default function AdminPlatform() {
  const router = useRouter()
  const { slug } = useParams() as { slug: string }
  const [companies, setCompanies] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    if (!u.is_platform_admin) {
      router.push(`/${slug}/dashboard`)
      return
    }
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: comps }, { data: st }] = await Promise.all([
      supabase.rpc('admin_list_companies'),
      supabase.rpc('admin_platform_stats')
    ])
    setCompanies(comps || [])
    setStats(st || {})
    setLoading(false)
  }

  const filtered = companies.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && 
        !c.owner_email?.toLowerCase().includes(search.toLowerCase()) &&
        !c.slug.toLowerCase().includes(search.toLowerCase())) return false
    if (filter !== 'all' && c.subscription_status !== filter) return false
    return true
  })

  function getDaysLeft(c: any): string {
    if (c.subscription_status === 'trial' && c.trial_end) {
      const days = Math.ceil((new Date(c.trial_end).getTime() - Date.now()) / 86400000)
      return days > 0 ? `${days}j restants` : 'Expiré'
    }
    if (c.subscription_status === 'active' && c.end_date) {
      const days = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000)
      return `${days}j`
    }
    return '—'
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,letterSpacing:'-.3px',display:'flex',alignItems:'center',gap:10}}>
            👑 Admin RS
            <span style={{fontSize:11,background:'linear-gradient(135deg,#7c3aed,#5B3DF5)',color:'#fff',padding:'3px 10px',borderRadius:20,fontWeight:600}}>Platform</span>
          </div>
          <div style={{fontSize:12,color:'#a8a69e',marginTop:4}}>Gestion complète de toutes les entreprises clients</div>
        </div>
      </div>

      {/* STATS GLOBALES */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:12,marginBottom:18}}>
        {[
          {label:'Entreprises', val:stats.total_companies||0, color:'#1a1916'},
          {label:'Trials actifs', val:stats.trial_subs||0, color:'#d97706'},
          {label:'Abonnements actifs', val:stats.active_subs||0, color:'#16a34a'},
          {label:'Trials expirés', val:stats.expired_subs||0, color:'#dc2626'},
          {label:'CA total clients', val:dzd(stats.total_revenue_all||0), color:'#5B3DF5', mono:true},
          {label:'MRR', val:dzd(stats.mrr||0), color:'#2563EB', mono:true},
        ].map((s:any,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'14px 18px'}}>
            <div style={{fontSize:10,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:s.mono?14:18,fontWeight:700,color:s.color,fontFamily:s.mono?'JetBrains Mono,monospace':'inherit'}}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* FILTRES */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <input placeholder="Rechercher (nom, email, slug)..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{flex:1,minWidth:200,padding:'8px 12px',border:'1px solid rgba(0,0,0,0.14)',borderRadius:6,fontSize:13,fontFamily:'inherit'}}/>
        {[
          {v:'all',l:'Toutes'},
          {v:'trial',l:'Trial'},
          {v:'active',l:'Active'},
          {v:'suspended',l:'Suspendu'},
        ].map(f=>(
          <button key={f.v} onClick={()=>setFilter(f.v)}
            style={{padding:'7px 14px',fontSize:12,borderRadius:5,border:'1px solid rgba(0,0,0,0.14)',cursor:'pointer',background:filter===f.v?'#7c3aed':'#fff',color:filter===f.v?'#fff':'#6b6860',fontWeight:filter===f.v?600:400}}>
            {f.l}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,overflow:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
          <thead>
            <tr style={{background:'#f0eeea'}}>
              {['Entreprise','Owner','Statut','Plan','Échéance','Stats','CA','Actions'].map(h=>(
                <th key={h} style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',padding:'10px 14px',textAlign:'left',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading?<tr><td colSpan={8} style={{padding:30,textAlign:'center',color:'#a8a69e'}}>Chargement...</td></tr>
            :filtered.length===0?<tr><td colSpan={8} style={{padding:30,textAlign:'center',color:'#a8a69e'}}>Aucune entreprise</td></tr>
            :filtered.map(c => {
              const badge = STATUS_BADGES[c.subscription_status] || STATUS_BADGES.no_sub
              return (
                <tr key={c.company_id} style={{borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
                  <td style={{padding:'12px 14px'}}>
                    <div style={{fontSize:13,fontWeight:600,color:'#1a1916'}}>{c.name}</div>
                    <div style={{fontSize:10,color:'#a8a69e',fontFamily:'JetBrains Mono,monospace',marginTop:2}}>/{c.slug}</div>
                  </td>
                  <td style={{padding:'12px 14px'}}>
                    <div style={{fontSize:12,fontWeight:500}}>{c.owner_full_name||'—'}</div>
                    <div style={{fontSize:10,color:'#a8a69e',marginTop:2}}>{c.owner_email}</div>
                  </td>
                  <td style={{padding:'12px 14px'}}>
                    <span style={{fontSize:10,padding:'3px 8px',borderRadius:4,background:badge.bg,color:badge.color,fontWeight:600,whiteSpace:'nowrap'}}>{badge.label}</span>
                  </td>
                  <td style={{padding:'12px 14px',fontSize:12,color:'#6b6860'}}>{c.plan}</td>
                  <td style={{padding:'12px 14px',fontSize:11,color:'#6b6860',fontFamily:'JetBrains Mono,monospace'}}>{getDaysLeft(c)}</td>
                  <td style={{padding:'12px 14px',fontSize:11,color:'#6b6860'}}>
                    {c.nb_clients}c · {c.nb_bills}f · {c.nb_users}u
                  </td>
                  <td style={{padding:'12px 14px',fontSize:12,fontFamily:'JetBrains Mono,monospace',color:'#16a34a',fontWeight:600}}>
                    {dzd(c.total_revenue)}
                  </td>
                  <td style={{padding:'12px 14px'}}>
                    <button onClick={()=>router.push(`/${slug}/dashboard/admin-platform/${c.company_id}`)}
                      style={{padding:'5px 12px',fontSize:11,fontWeight:600,background:'#7c3aed',color:'#fff',border:'none',borderRadius:5,cursor:'pointer',fontFamily:'inherit'}}>
                      Gérer →
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}