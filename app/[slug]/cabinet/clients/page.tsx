'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Building2, CreditCard, ExternalLink, Settings2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import { fetchCabinetClients } from '@/lib/cabinet-api'
import { useRealtime } from '@/lib/useRealtime'
import { loadManagedClientWorkspaces } from '@/lib/workspace-client'

function dzd(value: number) {
  return (value || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 0 }) + ' DZD'
}

export default function CabinetClientsPage() {
  const { slug } = useParams() as { slug: string }
  const [companies, setCompanies] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  async function fallbackLoad() {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (!user.company_id) return
    const managed = await loadManagedClientWorkspaces(user.company_id, slug)
    setCompanies((managed || []).map((company: any) => ({
      ...company,
      demandes: company.demandes || 0,
      tickets: company.tickets || 0,
      billed: company.billed || 0,
      paid: company.paid || 0,
    })))
  }

  useEffect(() => {
    async function load() {
      setLoading(true)

      try {
        const data = await fetchCabinetClients(slug)
        setCompanies(data.companies || [])
        setLoadError('')
      } catch (error: any) {
        setLoadError(error?.message || 'Chargement clients indisponible')
        await fallbackLoad()
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [slug])

  useRealtime(
    ['service_requests', 'support_tickets', 'bills'],
    async () => {
      try {
        const data = await fetchCabinetClients(slug)
        setCompanies(data.companies || [])
        setLoadError('')
      } catch {
        await fallbackLoad()
      }
    },
    { intervalMs: 4000, deps: [slug] },
  )

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return companies
    return companies.filter((company) =>
      company.name?.toLowerCase().includes(query) ||
      company.slug?.toLowerCase().includes(query) ||
      company.owner_email?.toLowerCase().includes(query),
    )
  }, [companies, search])

  return (
    <div className="cabinet-page">
      <section className="workspace-panel">
        <div className="workspace-section-head">
          <div>
            <div className="workspace-section-title">Clients geres</div>
            <div className="workspace-section-copy">Portefeuille client, charge active et acces rapides de configuration.</div>
            {loadError ? (
              <div style={{ marginTop:8, color:'#f59e0b', fontSize:12 }}>
                {loadError}. Affichage portefeuille en mode secours.
              </div>
            ) : null}
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input
              className="workspace-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un client, slug ou email"
              style={{ width:320 }}
            />
          </div>
        </div>

        {loading ? (
          <div className="workspace-empty">Chargement des clients...</div>
        ) : filtered.length === 0 ? (
          <div className="workspace-empty">Aucun client gere pour ce filtre.</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="workspace-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Charge</th>
                  <th>Facturation</th>
                  <th>Modules</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((company) => (
                  <tr key={company.id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div className="ws-brand-mark" style={{ width:36, height:36, borderRadius:10, background:'#2563EB', boxShadow:'none' }}>
                          {String(company.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="workspace-row-title">{company.name}</div>
                          <div className="workspace-row-meta">/{company.slug} {company.owner_email ? `• ${company.owner_email}` : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="workspace-chip-row" style={{ marginTop:0 }}>
                        <span className="workspace-chip warning">{company.demandes} demandes</span>
                        <span className="workspace-chip accent">{company.tickets} tickets</span>
                      </div>
                    </td>
                    <td>
                      <div className="workspace-row-title">{dzd(company.billed)}</div>
                      <div className="workspace-row-meta">Encaisse {dzd(company.paid)}</div>
                    </td>
                    <td>
                      <div className="workspace-chip-row" style={{ marginTop:0 }}>
                        {(company.active_modules || []).slice(0, 4).map((moduleKey: string) => (
                          <span key={moduleKey} className="workspace-chip accent">{moduleKey}</span>
                        ))}
                        {(company.active_modules || []).length > 4 && (
                          <span className="workspace-chip">+{company.active_modules.length - 4}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        <Link className="workspace-button primary" href={`/${slug}/cabinet/clients/${company.id}`}>
                          <Settings2 size={14} />
                          <span>Gerer</span>
                        </Link>
                        <Link className="workspace-button ghost" href={`/${company.slug}/client`}>
                          <ExternalLink size={14} />
                          <span>Portail</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="workspace-kpi-grid">
        <div className="workspace-kpi">
          <div className="workspace-kpi-label">Workspaces actifs</div>
          <div className="workspace-kpi-value">{companies.length}</div>
          <div className="workspace-kpi-note">Clients actuellement rattaches au cabinet.</div>
        </div>
        <div className="workspace-kpi">
          <div className="workspace-kpi-label">Demandes ouvertes</div>
          <div className="workspace-kpi-value">{companies.reduce((sum, company) => sum + company.demandes, 0)}</div>
          <div className="workspace-kpi-note">Volume cumule des demandes client.</div>
        </div>
        <div className="workspace-kpi">
          <div className="workspace-kpi-label">Tickets ouverts</div>
          <div className="workspace-kpi-value">{companies.reduce((sum, company) => sum + company.tickets, 0)}</div>
          <div className="workspace-kpi-note">Suivi support transversal.</div>
        </div>
        <div className="workspace-kpi">
          <div className="workspace-kpi-label">Modules actifs</div>
          <div className="workspace-kpi-value">{companies.reduce((sum, company) => sum + (company.active_modules?.length || 0), 0)}</div>
          <div className="workspace-kpi-note">Base utile pour le pilotage abonnement.</div>
        </div>
      </section>

      <section className="workspace-panel">
        <div className="workspace-section-head">
          <div>
            <div className="workspace-section-title">Actions de pilotage</div>
            <div className="workspace-section-copy">Liens rapides vers les fonctions internes les plus frequentes.</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <Link className="workspace-button primary" href={`/${slug}/cabinet/abonnements`}>
            <CreditCard size={14} />
            <span>Voir les abonnements</span>
          </Link>
          <Link className="workspace-button ghost" href={`/${slug}/cabinet/configuration`}>
            <Settings2 size={14} />
            <span>Configurer les modules</span>
          </Link>
          <Link className="workspace-button ghost" href={`/${slug}/cabinet/documents`}>
            <Building2 size={14} />
            <span>Documents cabinet</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
