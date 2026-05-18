'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BellRing, HandCoins, Package, Receipt, Truck, Users, WalletCards } from 'lucide-react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function dzd(value: number) {
  return (value || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 0 }) + ' DZD'
}

export default function ClientHomePage() {
  const { slug } = useParams() as { slug: string }
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    bills: 0,
    clients: 0,
    products: 0,
    paid: 0,
    due: 0,
    demandes: 0,
  })

  useEffect(() => {
    async function load() {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      if (!user.company_id) return

      setLoading(true)
      try {
        const [{ data: bills }, { count: clients }, { count: products }, { count: demandes }] = await Promise.all([
          supabase.from('bills').select('total_amount,paid_amount,status').eq('company_id', user.company_id).eq('is_archived', false),
          supabase.from('clients').select('*', { count: 'exact', head: true }).eq('company_id', user.company_id).eq('is_archived', false),
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('company_id', user.company_id).eq('is_archived', false),
          supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('company_id', user.company_id),
        ])

        const paid = (bills || []).reduce((sum: number, bill: any) => sum + Number(bill.paid_amount || 0), 0)
        const due = (bills || []).reduce((sum: number, bill: any) => sum + Math.max(0, Number(bill.total_amount || 0) - Number(bill.paid_amount || 0)), 0)

        setStats({
          bills: (bills || []).length,
          clients: clients || 0,
          products: products || 0,
          paid,
          due,
          demandes: demandes || 0,
        })
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) {
    return <div style={{ color:'var(--ws-muted)' }}>Chargement du portail client...</div>
  }

  return (
    <div className="client-page">
      <section className="workspace-panel">
        <div className="workspace-section-head">
          <div>
            <div className="workspace-section-title">Vue d ensemble</div>
            <div className="workspace-section-copy">Les chiffres utiles et vos acces rapides du quotidien.</div>
          </div>
        </div>

        <div className="workspace-kpi-grid">
          <div className="workspace-kpi">
            <div className="workspace-kpi-label">Factures</div>
            <div className="workspace-kpi-value">{stats.bills}</div>
            <div className="workspace-kpi-note">Documents emis dans cet espace client.</div>
          </div>
          <div className="workspace-kpi">
            <div className="workspace-kpi-label">Clients</div>
            <div className="workspace-kpi-value">{stats.clients}</div>
            <div className="workspace-kpi-note">Base clients pour votre facturation.</div>
          </div>
          <div className="workspace-kpi">
            <div className="workspace-kpi-label">Encaisse</div>
            <div className="workspace-kpi-value">{dzd(stats.paid)}</div>
            <div className="workspace-kpi-note">Montants payes et enregistres.</div>
          </div>
          <div className="workspace-kpi">
            <div className="workspace-kpi-label">A recevoir</div>
            <div className="workspace-kpi-value">{dzd(stats.due)}</div>
            <div className="workspace-kpi-note">Solde restant sur vos factures.</div>
          </div>
        </div>
      </section>

      <section className="workspace-panel">
        <div className="workspace-section-head">
          <div>
            <div className="workspace-section-title">Actions rapides</div>
            <div className="workspace-section-copy">Les acces les plus frequents du portail client.</div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:12 }}>
          {[
            { href:`/${slug}/client/factures`, label:'Factures', meta:'Creer, suivre et imprimer', icon: Receipt },
            { href:`/${slug}/client/paiements`, label:'Paiements', meta:'Suivre les encaissements', icon: WalletCards },
            { href:`/${slug}/client/clients`, label:'Clients', meta:'Gerer les contacts factures', icon: Users },
            { href:`/${slug}/client/produits`, label:'Produits', meta:'Catalogue commercial', icon: Package },
            { href:`/${slug}/client/fournisseurs`, label:'Fournisseurs', meta:'Contacts d achat', icon: Truck },
            { href:`/${slug}/client/depenses`, label:'Depenses', meta:'Suivi des sorties', icon: HandCoins },
            { href:`/${slug}/client/demandes`, label:'Demandes', meta:`${stats.demandes} demande(s)`, icon: BellRing },
            { href:`/${slug}/client/stock`, label:'Stock', meta:'Pilotage inventaire', icon: Package },
          ].map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href} className="workspace-list-row" style={{ textDecoration:'none', color:'inherit' }}>
                <div>
                  <div className="workspace-row-title">{item.label}</div>
                  <div className="workspace-row-meta">{item.meta}</div>
                </div>
                <span className="workspace-chip accent">
                  <Icon size={13} />
                </span>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
