'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, BellRing, CreditCard, FileArchive, Ticket } from 'lucide-react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { loadManagedClientWorkspaces } from '@/lib/workspace-client'

export default function CabinetHomePage() {
  const { slug } = useParams() as { slug: string }
  const [companies, setCompanies] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalClients: 0,
    totalDemandes: 0,
    pendingDemandes: 0,
    totalTickets: 0,
    openTickets: 0,
    totalDocuments: 0,
  })
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
          const [{ data: demandes }, { data: tickets }, { count: documents }] = await Promise.all([
            supabase.from('service_requests').select('id,status,company_id').in('company_id', ids),
            supabase.from('support_tickets').select('id,status,company_id').in('company_id', ids),
            supabase.from('document_archive_files').select('*', { count: 'exact', head: true }).in('company_id', ids),
          ])

          setStats({
            totalClients: managed.length,
            totalDemandes: (demandes || []).length,
            pendingDemandes: (demandes || []).filter((row: any) => ['pending', 'in_review', 'approved', 'in_progress'].includes(row.status)).length,
            totalTickets: (tickets || []).length,
            openTickets: (tickets || []).filter((row: any) => ['open', 'in_progress', 'waiting_client'].includes(row.status)).length,
            totalDocuments: documents || 0,
          })
        } else {
          setStats({
            totalClients: 0,
            totalDemandes: 0,
            pendingDemandes: 0,
            totalTickets: 0,
            openTickets: 0,
            totalDocuments: 0,
          })
        }
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const topClients = useMemo(
    () => companies.slice(0, 5),
    [companies],
  )

  if (loading) {
    return <div style={{ color:'var(--ws-muted)' }}>Chargement du tableau cabinet...</div>
  }

  return (
    <div className="cabinet-page">
      <section className="cabinet-hero">
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
          <span className="workspace-chip accent">
            <BellRing size={13} />
            <span>Operations cabinet</span>
          </span>
          <span className="workspace-chip">
            <CreditCard size={13} />
            <span>{stats.totalClients} clients geres</span>
          </span>
        </div>
        <div className="workspace-section-title" style={{ fontSize:28 }}>Pilotage interne du cabinet</div>
        <div className="workspace-section-copy" style={{ maxWidth:820, marginTop:10 }}>
          Vue mixte sur le portefeuille client, les flux a traiter et les points de suivi abonnement. Le cabinet pilote ici toute la relation operationnelle avec ses clients.
        </div>
      </section>

      <section className="workspace-kpi-grid">
        <div className="workspace-kpi">
          <div className="workspace-kpi-label">Clients geres</div>
          <div className="workspace-kpi-value">{stats.totalClients}</div>
          <div className="workspace-kpi-note">Workspaces clients actuellement relies au cabinet.</div>
        </div>
        <div className="workspace-kpi">
          <div className="workspace-kpi-label">Demandes en cours</div>
          <div className="workspace-kpi-value">{stats.pendingDemandes}</div>
          <div className="workspace-kpi-note">{stats.totalDemandes} demandes au total dans la file.</div>
        </div>
        <div className="workspace-kpi">
          <div className="workspace-kpi-label">Tickets ouverts</div>
          <div className="workspace-kpi-value">{stats.openTickets}</div>
          <div className="workspace-kpi-note">{stats.totalTickets} tickets traces dans la base.</div>
        </div>
        <div className="workspace-kpi">
          <div className="workspace-kpi-label">Documents archives</div>
          <div className="workspace-kpi-value">{stats.totalDocuments}</div>
          <div className="workspace-kpi-note">Pieces archivees dans les dossiers d'exercice.</div>
        </div>
      </section>

      <section className="workspace-split">
        <div className="workspace-panel">
          <div className="workspace-section-head">
            <div>
              <div className="workspace-section-title">Portefeuille prioritaire</div>
              <div className="workspace-section-copy">Acces rapide aux principaux dossiers client du cabinet.</div>
            </div>
            <Link className="workspace-button ghost" href={`/${slug}/cabinet/clients`}>
              <span>Voir tous</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>

          {topClients.length === 0 ? (
            <div className="workspace-empty">Aucun client gere pour le moment.</div>
          ) : (
            <div className="workspace-list">
              {topClients.map((company: any) => (
                <div key={company.id} className="workspace-list-row">
                  <div>
                    <div className="workspace-row-title">{company.name}</div>
                    <div className="workspace-row-meta">/{company.slug} {company.owner_email ? `• ${company.owner_email}` : ''}</div>
                    <div className="workspace-chip-row">
                      {(company.active_modules || []).slice(0, 4).map((moduleKey: string) => (
                        <span key={moduleKey} className="workspace-chip accent">{moduleKey}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <Link className="workspace-button primary" href={`/${slug}/cabinet/clients/${company.id}`}>
                      <span>Ouvrir</span>
                    </Link>
                    <Link className="workspace-button ghost" href={`/${company.slug}/client`}>
                      <span>Portail</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display:'grid', gap:18 }}>
          <section className="workspace-panel">
            <div className="workspace-section-head">
              <div>
                <div className="workspace-section-title">Files de traitement</div>
                <div className="workspace-section-copy">Les flux les plus frequents pour les equipes internes.</div>
              </div>
            </div>
            <div className="workspace-list">
              <Link href={`/${slug}/cabinet/demandes`} className="workspace-list-row" style={{ textDecoration:'none', color:'inherit' }}>
                <div>
                  <div className="workspace-row-title">Demandes</div>
                  <div className="workspace-row-meta">Validation, preparation et livraison.</div>
                </div>
                <span className="workspace-chip warning">
                  <BellRing size={13} />
                  <span>{stats.pendingDemandes} actives</span>
                </span>
              </Link>
              <Link href={`/${slug}/cabinet/tickets`} className="workspace-list-row" style={{ textDecoration:'none', color:'inherit' }}>
                <div>
                  <div className="workspace-row-title">Tickets</div>
                  <div className="workspace-row-meta">Support client et retours en attente.</div>
                </div>
                <span className="workspace-chip accent">
                  <Ticket size={13} />
                  <span>{stats.openTickets} ouverts</span>
                </span>
              </Link>
              <Link href={`/${slug}/cabinet/documents`} className="workspace-list-row" style={{ textDecoration:'none', color:'inherit' }}>
                <div>
                  <div className="workspace-row-title">Documents</div>
                  <div className="workspace-row-meta">Archives par exercice et depot documentaire.</div>
                </div>
                <span className="workspace-chip success">
                  <FileArchive size={13} />
                  <span>{stats.totalDocuments} traces</span>
                </span>
              </Link>
            </div>
          </section>

          <section className="workspace-panel">
            <div className="workspace-section-head">
              <div>
                <div className="workspace-section-title">Pilotage admin</div>
                <div className="workspace-section-copy">Abonnements et configuration disponibles depuis l espace interne.</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <Link className="workspace-button primary" href={`/${slug}/cabinet/abonnements`}>
                <CreditCard size={14} />
                <span>Abonnements</span>
              </Link>
              <Link className="workspace-button ghost" href={`/${slug}/cabinet/configuration`}>
                <CreditCard size={14} />
                <span>Configuration modules</span>
              </Link>
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}
