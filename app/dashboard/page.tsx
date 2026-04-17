'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function dzd(v: number) {
  return (v || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 2 }) + ' DZD'
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({ clients: 0, factures: 0, paye: 0, impaye: 0 })
  const [recentBills, setRecentBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('semaine')
  const router = useRouter()

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    setUser(JSON.parse(u))
    fetchStats()
  }, [])

  async function fetchStats() {
    const [{ count: clients }, { data: bills }, { data: recent }] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_archived', false),
      supabase.from('bills').select('total_amount, paid_amount, status').eq('is_archived', false),
      supabase.from('bills').select('*, clients(full_name)').eq('is_archived', false).order('created_at', { ascending: false }).limit(5)
    ])
    const paye = (bills || []).filter(b => b.status === 'payé').reduce((s, b) => s + b.paid_amount, 0)
    const impaye = (bills || []).filter(b => b.status === 'impayé').reduce((s, b) => s + b.total_amount, 0)
    setStats({ clients: clients || 0, factures: (bills || []).length, paye, impaye })
    setRecentBills(recent || [])
    setLoading(false)
  }

  const statusBadge = (s: string) => {
    if (s === 'payé') return <span className="b-payee">Payé</span>
    if (s === 'partiel') return <span className="b-partiel">Partiel</span>
    return <span className="b-impaye">Impayé</span>
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#a8a69e' }}>
      Chargement...
    </div>
  )

  return (
    <div>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-.3px' }}>Tableau de bord</div>
          <div style={{ fontSize: 12, color: '#a8a69e', marginTop: 2 }}>
            Bonjour, <strong>{user?.full_name?.split(' ')[0]}</strong> — Bienvenue dans ABOU IYAD
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['semaine', 'mois', 'annee'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: '6px 12px', borderRadius: 5, fontSize: 12, cursor: 'pointer', border: '1px solid rgba(0,0,0,0.14)', fontFamily: 'Outfit, sans-serif', background: period === p ? '#2563EB' : '#fff', color: period === p ? '#fff' : '#6b6860', transition: 'all .15s' }}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
        <div className="stat-card">
          <div className="stat-label">Chiffre d'affaires</div>
          <div className="stat-value" style={{ color: '#16a34a' }}>{dzd(stats.paye)}</div>
          <div className="stat-sub"><span style={{ color: '#16a34a' }}>↑ 14,2 %</span> vs période préc.</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Clients actifs</div>
          <div className="stat-value">{stats.clients}</div>
          <div className="stat-sub">Clients enregistrés</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Impayés</div>
          <div className="stat-value" style={{ color: '#d97706' }}>{dzd(stats.impaye)}</div>
          <div className="stat-sub">{stats.factures} factures total</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Taux recouvrement</div>
          <div className="stat-value">{stats.factures ? Math.round((stats.paye / (stats.paye + stats.impaye)) * 100) || 0 : 0} %</div>
          <div className="stat-sub"><span style={{ color: '#16a34a' }}>↑ 3 %</span> amélioration</div>
        </div>
      </div>

      {/* CHARTS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="gp-card">
          <div className="gp-card-header"><span className="gp-card-title">Revenus (6 derniers mois)</span></div>
          <div className="gp-card-body" style={{ paddingBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90, marginTop: 8 }}>
              {[55, 72, 48, 88, 64, 100].map((h, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ width: '100%', height: h, borderRadius: '3px 3px 0 0', background: '#2563EB', opacity: i === 5 ? 1 : 0.55 }} />
                  <span style={{ fontSize: 10, color: '#a8a69e' }}>
                    {['Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar'][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="gp-card">
          <div className="gp-card-header"><span className="gp-card-title">Répartition des factures</span></div>
          <div className="gp-card-body">
            {[
              { label: 'Payées', pct: 68, color: '#16a34a' },
              { label: 'Partielles', pct: 17, color: '#d97706' },
              { label: 'Impayées', pct: 15, color: '#dc2626' },
            ].map(item => (
              <div key={item.label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: '#6b6860' }}>{item.label}</span>
                  <span style={{ color: item.color }}>{item.pct} %</span>
                </div>
                <div className="prog-bar">
                  <div className="prog-fill" style={{ width: `${item.pct}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECENT + ACTIVITY */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="gp-card">
          <div className="gp-card-header">
            <span className="gp-card-title">Dernières factures</span>
            <Link href="/dashboard/factures" style={{ fontSize: 12, color: '#2563EB', textDecoration: 'none' }}>Voir tout</Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="gp-table">
              <tbody>
                {recentBills.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: '#a8a69e', fontSize: 13 }}>Aucune facture</td></tr>
                ) : recentBills.map(b => (
                  <tr key={b.id}>
                    <td><span className="mono" style={{ color: '#2563EB' }}>{b.invoice_number}</span></td>
                    <td style={{ fontSize: 13 }}>{b.clients?.full_name}</td>
                    <td><span className="mono">{dzd(b.total_amount)}</span></td>
                    <td>{statusBadge(b.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="gp-card">
          <div className="gp-card-header"><span className="gp-card-title">Activité récente</span></div>
          <div className="gp-card-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
            {[
              { color: '#16a34a', text: 'Connexion au système réussie', time: "À l'instant" },
              { color: '#2563EB', text: 'Bienvenue dans ABOU IYAD', time: 'Système' },
              { color: '#7c3aed', text: 'Développé par RS Comptabilité', time: 'v1.0.0' },
            ].map((a, i) => (
              <div key={i} className="activity-item">
                <div className="activity-dot" style={{ background: a.color }} />
                <div>
                  <div style={{ fontSize: 13, lineHeight: 1.4 }}>{a.text}</div>
                  <div style={{ fontSize: 10, color: '#a8a69e', marginTop: 1 }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* QUICK ACCESS */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1916', marginBottom: 12 }}>Accès rapide</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[
            { label: 'Nouveau client', href: '/dashboard/clients', color: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.15)', icon: '👥' },
            { label: 'Nouvelle facture', href: '/dashboard/factures', color: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.15)', icon: '📄' },
            { label: 'Enregistrer paiement', href: '/dashboard/paiements', color: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.15)', icon: '💰' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: item.color, border: `1px solid ${item.border}`, borderRadius: 8, textDecoration: 'none', transition: 'all .15s' }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1916' }}>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}