'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CreditCard, ShieldCheck } from 'lucide-react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function dzd(value: number) {
  return (value || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 0 }) + ' DZD'
}

export default function CabinetSubscriptionsPage() {
  const { slug } = useParams() as { slug: string }
  const [companies, setCompanies] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [{ data: comps }, { data: platformStats }] = await Promise.all([
          supabase.rpc('admin_list_companies'),
          supabase.rpc('admin_platform_stats'),
        ])
        setCompanies(comps || [])
        setStats(platformStats || {})
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const active = useMemo(() => companies.filter((company) => company.subscription_status === 'active'), [companies])

  return (
    <div className="cabinet-page">
      <section className="cabinet-hero">
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <span className="workspace-chip accent">
            <ShieldCheck size={13} />
            <span>Pilotage abonnement</span>
          </span>
        </div>
        <div className="workspace-section-title" style={{ fontSize:24 }}>Abonnements et portefeuille recurrent</div>
        <div className="workspace-section-copy" style={{ maxWidth:760 }}>
          Vue interne sur les revenus, trials, activations et comptes clients a surveiller. Cette page est reservee a l administration du cabinet.
        </div>
      </section>

      <section className="workspace-kpi-grid">
        <div className="workspace-kpi">
          <div className="workspace-kpi-label">MRR</div>
          <div className="workspace-kpi-value">{dzd(stats.mrr || 0)}</div>
          <div className="workspace-kpi-note">Revenus mensuels recurrents.</div>
        </div>
        <div className="workspace-kpi">
          <div className="workspace-kpi-label">Actifs</div>
          <div className="workspace-kpi-value">{stats.active_subs || 0}</div>
          <div className="workspace-kpi-note">Abonnements clients actuellement actifs.</div>
        </div>
        <div className="workspace-kpi">
          <div className="workspace-kpi-label">Trials</div>
          <div className="workspace-kpi-value">{stats.trial_subs || 0}</div>
          <div className="workspace-kpi-note">Comptes encore en periode d essai.</div>
        </div>
        <div className="workspace-kpi">
          <div className="workspace-kpi-label">Chiffre cumule</div>
          <div className="workspace-kpi-value">{dzd(stats.total_revenue_all || 0)}</div>
          <div className="workspace-kpi-note">Revenus agreges portefeuille clients.</div>
        </div>
      </section>

      <section className="workspace-panel">
        <div className="workspace-section-head">
          <div>
            <div className="workspace-section-title">Comptes actifs</div>
            <div className="workspace-section-copy">Liste prioritaire pour le pilotage commercial et contractuel.</div>
          </div>
        </div>

        {loading ? (
          <div className="workspace-empty">Chargement des abonnements...</div>
        ) : active.length === 0 ? (
          <div className="workspace-empty">Aucun abonnement actif pour le moment.</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="workspace-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Plan</th>
                  <th>Statut</th>
                  <th>Volume</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {active.map((company) => (
                  <tr key={company.company_id}>
                    <td>
                      <div className="workspace-row-title">{company.name}</div>
                      <div className="workspace-row-meta">/{company.slug} {company.owner_email ? `• ${company.owner_email}` : ''}</div>
                    </td>
                    <td>
                      <span className="workspace-chip accent">{company.plan || '—'}</span>
                    </td>
                    <td>
                      <span className="workspace-chip success">{company.subscription_status}</span>
                    </td>
                    <td>
                      <div className="workspace-row-meta">{company.nb_clients || 0} comptes • {company.nb_users || 0} users</div>
                    </td>
                    <td>
                      <Link className="workspace-button primary" href={`/${slug}/cabinet/clients/${company.company_id}`}>
                        <CreditCard size={14} />
                        <span>Ouvrir la fiche</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
