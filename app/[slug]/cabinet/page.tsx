'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { loadManagedClientWorkspaces } from '@/lib/workspace-client'

const card: React.CSSProperties = {
  background:'#fff',
  border:'1px solid rgba(0,0,0,0.08)',
  borderRadius:12,
  padding:18,
}

export default function CabinetHomePage() {
  const [companies, setCompanies] = useState<any[]>([])
  const [stats, setStats] = useState({ demandes: 0, tickets: 0, documents: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      if (!user.company_id) return

      setLoading(true)
      try {
        const managed = await loadManagedClientWorkspaces(user.company_id)
        const ids = managed.map((company: any) => company.id).filter(Boolean)
        setCompanies(managed)

        if (ids.length > 0) {
          const [{ count: demandes }, { count: tickets }, { count: documents }] = await Promise.all([
            supabase.from('service_requests').select('*', { count: 'exact', head: true }).in('company_id', ids),
            supabase.from('support_tickets').select('*', { count: 'exact', head: true }).in('company_id', ids),
            supabase.from('client_documents').select('*', { count: 'exact', head: true }).in('company_id', ids),
          ])

          setStats({
            demandes: demandes || 0,
            tickets: tickets || 0,
            documents: documents || 0,
          })
        } else {
          setStats({ demandes: 0, tickets: 0, documents: 0 })
        }
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const activeModulesCount = useMemo(
    () => companies.reduce((sum, company) => sum + (company.active_modules?.length || 0), 0),
    [companies],
  )

  if (loading) {
    return <div style={{ color:'#6b6860' }}>Chargement du cabinet...</div>
  }

  return (
    <div style={{ display:'grid', gap:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12 }}>
        <div style={card}>
          <div style={{ fontSize:11, color:'#6b6860', textTransform:'uppercase', marginBottom:6 }}>Clients geres</div>
          <div style={{ fontSize:28, fontWeight:800 }}>{companies.length}</div>
        </div>
        <div style={card}>
          <div style={{ fontSize:11, color:'#6b6860', textTransform:'uppercase', marginBottom:6 }}>Demandes</div>
          <div style={{ fontSize:28, fontWeight:800 }}>{stats.demandes}</div>
        </div>
        <div style={card}>
          <div style={{ fontSize:11, color:'#6b6860', textTransform:'uppercase', marginBottom:6 }}>Tickets</div>
          <div style={{ fontSize:28, fontWeight:800 }}>{stats.tickets}</div>
        </div>
        <div style={card}>
          <div style={{ fontSize:11, color:'#6b6860', textTransform:'uppercase', marginBottom:6 }}>Modules actifs</div>
          <div style={{ fontSize:28, fontWeight:800 }}>{activeModulesCount}</div>
        </div>
      </div>

      <div style={card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700 }}>Portefeuille clients</div>
            <div style={{ fontSize:12, color:'#6b6860', marginTop:4 }}>
              Les workspaces clients actives et leurs modules disponibles.
            </div>
          </div>
          <Link href="../admin-rs" style={{ textDecoration:'none', color:'#2563EB', fontWeight:600, fontSize:12 }}>
            Ouvrir Admin RS
          </Link>
        </div>

        {companies.length === 0 ? (
          <div style={{ fontSize:13, color:'#6b6860' }}>Aucun client gere pour ce cabinet.</div>
        ) : (
          <div style={{ display:'grid', gap:10 }}>
            {companies.map((company: any) => (
              <div key={company.id} style={{ border:'1px solid rgba(0,0,0,0.08)', borderRadius:10, padding:14, display:'grid', gridTemplateColumns:'minmax(0,1fr) auto', gap:12, alignItems:'center' }}>
                <div>
                  <div style={{ fontWeight:700 }}>{company.name}</div>
                  <div style={{ fontSize:11, color:'#6b6860', marginTop:4 }}>
                    /{company.slug} {company.owner_email ? `• ${company.owner_email}` : ''}
                  </div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10 }}>
                    {(company.active_modules || []).map((moduleKey: string) => (
                      <span key={moduleKey} style={{ fontSize:11, padding:'4px 8px', borderRadius:999, background:'rgba(37,99,235,0.08)', color:'#2563EB', fontWeight:600 }}>
                        {moduleKey}
                      </span>
                    ))}
                  </div>
                </div>
                <Link href={`/${company.slug}/client`} style={{ textDecoration:'none', color:'#1a1916', fontWeight:700, fontSize:13 }}>
                  Ouvrir le portail
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
