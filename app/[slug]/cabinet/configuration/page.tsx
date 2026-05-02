'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Settings2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import { loadManagedClientWorkspaces } from '@/lib/workspace-client'

export default function CabinetConfigurationPage() {
  const { slug } = useParams() as { slug: string }
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      if (!user.company_id) return
      setLoading(true)
      try {
        const managed = await loadManagedClientWorkspaces(user.company_id)
        setCompanies(managed)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <div className="cabinet-page">
      <section className="workspace-panel">
        <div className="workspace-section-head">
          <div>
            <div className="workspace-section-title">Configuration et modules</div>
            <div className="workspace-section-copy">Affectation des modules par workspace client, avec acces direct a chaque fiche de parametrage.</div>
          </div>
        </div>

        {loading ? (
          <div className="workspace-empty">Chargement de la matrice modules...</div>
        ) : companies.length === 0 ? (
          <div className="workspace-empty">Aucun workspace client a configurer.</div>
        ) : (
          <div className="workspace-list">
            {companies.map((company) => (
              <div key={company.id} className="workspace-list-row">
                <div>
                  <div className="workspace-row-title">{company.name}</div>
                  <div className="workspace-row-meta">/{company.slug}</div>
                  <div className="workspace-chip-row">
                    {(company.active_modules || []).map((moduleKey: string) => (
                      <span key={moduleKey} className="workspace-chip accent">{moduleKey}</span>
                    ))}
                  </div>
                </div>
                <Link className="workspace-button primary" href={`/${slug}/cabinet/clients/${company.id}`}>
                  <Settings2 size={14} />
                  <span>Configurer</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
