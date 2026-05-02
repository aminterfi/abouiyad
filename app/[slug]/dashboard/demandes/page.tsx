'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePathname } from 'next/navigation'
import { loadOperationalScope } from '@/lib/workspace-client'

const page: React.CSSProperties = { display:'grid', gap:18 }
const grid: React.CSSProperties = { display:'grid', gap:18 }
const card: React.CSSProperties = {
  background:'var(--ws-panel)',
  border:'1px solid var(--ws-border)',
  borderRadius:14,
  padding:18,
  display:'grid',
  gap:14,
}
const softCard: React.CSSProperties = { ...card, background:'var(--ws-panel-2)' }
const head: React.CSSProperties = { display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }
const titleText: React.CSSProperties = { fontSize:15, fontWeight:800 }
const copy: React.CSSProperties = { fontSize:12, color:'var(--ws-muted)' }
const field: React.CSSProperties = {
  width:'100%',
  minHeight:42,
  padding:'10px 12px',
  borderRadius:10,
  border:'1px solid var(--ws-border)',
  background:'var(--ws-panel-2)',
  color:'var(--ws-text)',
  font:'inherit',
}
const textarea: React.CSSProperties = { ...field, minHeight:100, resize:'vertical' }
const actions: React.CSSProperties = { display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap' }
const actionRow: React.CSSProperties = { display:'flex', gap:8, flexWrap:'wrap' }
const button: React.CSSProperties = {
  appearance:'none',
  border:'1px solid transparent',
  background:'linear-gradient(135deg, var(--ws-accent), var(--ws-accent-2))',
  color:'#fff',
  borderRadius:10,
  minHeight:40,
  padding:'10px 14px',
  font:'inherit',
  fontSize:12,
  fontWeight:700,
  cursor:'pointer',
}
const statsGrid: React.CSSProperties = { display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:10 }
const stat: React.CSSProperties = { padding:14, borderRadius:12, border:'1px solid var(--ws-border)', background:'var(--ws-panel-2)' }
const statLabel: React.CSSProperties = { fontSize:11, color:'var(--ws-muted)' }
const statValue: React.CSSProperties = { marginTop:6, fontSize:24, fontWeight:800 }
const filterRow: React.CSSProperties = { display:'flex', gap:8, flexWrap:'wrap' }
const list: React.CSSProperties = { display:'grid', gap:10 }
const item: React.CSSProperties = { border:'1px solid var(--ws-border)', borderRadius:12, padding:14, background:'var(--ws-panel-2)', display:'grid', gap:12 }
const itemHead: React.CSSProperties = { display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }
const itemMain: React.CSSProperties = { minWidth:0, flex:1 }
const badges: React.CSSProperties = { display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }
const dateCol: React.CSSProperties = { fontSize:12, color:'var(--ws-muted)', textAlign:'right', display:'grid', gap:4 }

function filterButton(active: boolean): React.CSSProperties {
  return {
    appearance:'none',
    border:'1px solid var(--ws-border)',
    background: active ? '#f8fafc' : 'var(--ws-panel-2)',
    color: active ? '#0a0f17' : 'var(--ws-text)',
    borderRadius:999,
    padding:'7px 11px',
    font:'inherit',
    fontSize:12,
    cursor:'pointer',
  }
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label:'Nouvelle', color:'#b45309', bg:'rgba(245,158,11,0.12)' },
  in_review: { label:'En analyse', color:'#2563EB', bg:'rgba(37,99,235,0.12)' },
  approved: { label:'Validee', color:'#0d9488', bg:'rgba(13,148,136,0.12)' },
  in_progress: { label:'En preparation', color:'#7c3aed', bg:'rgba(124,58,237,0.12)' },
  ready: { label:'Prete', color:'#16a34a', bg:'rgba(22,163,74,0.12)' },
  delivered: { label:'Livree', color:'#166534', bg:'rgba(34,197,94,0.14)' },
  rejected: { label:'Refusee', color:'#dc2626', bg:'rgba(220,38,38,0.10)' },
}

const STATUS_ORDER = ['pending', 'in_review', 'approved', 'in_progress', 'ready', 'delivered']

function statusBadge(status: string) {
  const meta = STATUS_META[status] || STATUS_META.pending
  return (
    <span className="ops-pill" style={{ color:meta.color, background:meta.bg }}>
      {meta.label}
    </span>
  )
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('fr-DZ')
}

function requestTypeLabel(type: string) {
  if (type === 'g12') return 'G12'
  if (type === 'auto_document') return 'Document auto-genere'
  if (type === 'prepared_document') return 'Document a preparer'
  return 'Service'
}

function ProgressLine({ status }: { status: string }) {
  const activeIndex = Math.max(0, STATUS_ORDER.indexOf(status))
  return (
    <div className="ops-progress">
      <div className="ops-progress-line" style={{ gridTemplateColumns:`repeat(${STATUS_ORDER.length},1fr)` }}>
        {STATUS_ORDER.map((step, index) => (
          <div key={step} className={`ops-progress-step ${index <= activeIndex ? 'is-active' : ''}`} />
        ))}
      </div>
    </div>
  )
}

export default function DemandesPage() {
  const pathname = usePathname()
  const [rows, setRows] = useState<any[]>([])
  const [managedCompanies, setManagedCompanies] = useState<any[]>([])
  const [requestType, setRequestType] = useState('g12')
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [filter, setFilter] = useState('all')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)

  const [mode, setMode] = useState<'client' | 'cabinet'>('client')
  const canManage = mode === 'cabinet'

  async function load() {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
    setUser(currentUser)
    if (!currentUser.company_id) return

    const scope = await loadOperationalScope(currentUser.company_id, pathname)
    setMode(scope.mode)
    setManagedCompanies(scope.companies)

    const { data, error: err } = await supabase
      .from('service_requests')
      .select('*')
      .in('company_id', scope.companyIds)
      .order('created_at', { ascending: false })

    if (err) {
      setError('Module demandes non initialise dans la base.')
      return
    }

    setRows(data || [])
  }

  useEffect(() => { load() }, [pathname])

  useEffect(() => {
    let active = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function setup() {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
      if (!currentUser.company_id) return
      const scope = await loadOperationalScope(currentUser.company_id, pathname)
      if (!active) return
      const allowedCompanyIds = new Set(scope.companyIds)

      channel = supabase
        .channel(`demandes-live-${pathname}-${currentUser.id || currentUser.company_id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests' }, (payload: any) => {
          const companyId = payload?.new?.company_id || payload?.old?.company_id
          if (!companyId || !allowedCompanyIds.has(companyId)) return
          load()
        })
        .subscribe()
    }

    setup()
    return () => {
      active = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [pathname])

  async function createRequest() {
    setError('')
    if (!title.trim()) return
    setSaving(true)
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
    const { error: err } = await supabase.from('service_requests').insert({
      request_type: requestType,
      title: title.trim(),
      details: details.trim() || null,
      status: 'pending',
      requires_generated_document: requestType === 'g12' || requestType === 'auto_document',
      company_id: currentUser.company_id,
      created_by: currentUser.id,
    })
    if (err) {
      setError('Impossible de creer la demande.')
    }
    setTitle('')
    setDetails('')
    setRequestType('g12')
    setSaving(false)
    load()
  }

  async function updateStatus(row: any, nextStatus: string) {
    if (!canManage) return
    setSaving(true)
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
    const payload: any = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
    }

    if (nextStatus === 'approved') {
      payload.validated_by = currentUser.id
      payload.validated_at = new Date().toISOString()
    }
    if (nextStatus === 'delivered') {
      payload.completed_at = new Date().toISOString()
    }
    if (nextStatus === 'rejected') {
      payload.completed_at = null
    }

    const { error: err } = await supabase.from('service_requests').update(payload).eq('id', row.id)
    if (err) setError('Impossible de mettre a jour le statut.')
    setSaving(false)
    load()
  }

  const filtered = rows.filter((row) => filter === 'all' || row.status === filter)
  const companyLookup = Object.fromEntries(managedCompanies.map((company: any) => [company.id, company]))
  const counts = {
    total: rows.length,
    pending: rows.filter((r) => r.status === 'pending').length,
    inProgress: rows.filter((r) => ['in_review', 'approved', 'in_progress'].includes(r.status)).length,
    ready: rows.filter((r) => r.status === 'ready').length,
    delivered: rows.filter((r) => r.status === 'delivered').length,
  }

  return (
    <div style={page}>
      <div style={{ ...grid, gridTemplateColumns: canManage ? 'minmax(0, 1.15fr) minmax(320px, 0.85fr)' : '1fr' }}>
        <section style={card}>
          <div style={head}>
            <div>
              <div style={titleText}>Nouvelle demande client</div>
              <div style={copy}>G12, documents generes, documents prepares, ou service sur mesure.</div>
            </div>
            {statusBadge('pending')}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:10 }}>
            <select style={field} value={requestType} onChange={(e)=>setRequestType(e.target.value)}>
              <option value="g12">G12</option>
              <option value="auto_document">Document auto-genere</option>
              <option value="prepared_document">Document a preparer</option>
              <option value="other">Autre service</option>
            </select>
            <input style={field} value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Titre de la demande" />
          </div>

          <textarea style={textarea} value={details} onChange={(e)=>setDetails(e.target.value)} placeholder="Details, echeance, documents necessaires..." />

          {error && <div className="docs-error"><span>{error}</span></div>}

          <div style={actions}>
            <div style={copy}>Les mises a jour de statut seront visibles au client.</div>
            <button style={button} onClick={createRequest} disabled={saving}>{saving ? '...' : 'Envoyer la demande'}</button>
          </div>
        </section>

        {canManage && (
          <section style={softCard}>
            <div style={titleText}>Vue comptable</div>
            <div style={statsGrid}>
              <div style={stat}>
                <div style={statLabel}>Nouvelles</div>
                <div style={statValue}>{counts.pending}</div>
              </div>
              <div style={stat}>
                <div style={statLabel}>En traitement</div>
                <div style={statValue}>{counts.inProgress}</div>
              </div>
              <div style={stat}>
                <div style={statLabel}>Pretes</div>
                <div style={statValue}>{counts.ready}</div>
              </div>
              <div style={stat}>
                <div style={statLabel}>Livrees</div>
                <div style={statValue}>{counts.delivered}</div>
              </div>
            </div>
            <div style={copy}>Utilisez les statuts pour tenir le client informe sans sortir de l'application.</div>
          </section>
        )}
      </div>

      <section style={card}>
        <div style={head}>
          <div>
            <div style={titleText}>{canManage ? 'Ordres et demandes clients' : 'Suivi des demandes'}</div>
            <div style={copy}>
              {canManage ? 'Traitez les demandes et faites avancer leur statut.' : "Suivez l'avancement de vos demandes en temps reel."}
            </div>
          </div>
          <div style={filterRow}>
            {['all', 'pending', 'in_review', 'ready', 'delivered', 'rejected'].map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                style={filterButton(filter === value)}
              >
                {value === 'all' ? `Tout (${counts.total})` : STATUS_META[value]?.label || value}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={copy}>Aucune demande pour ce filtre.</div>
        ) : (
          <div style={list}>
            {filtered.map((row: any) => (
              <article key={row.id} style={item}>
                <div style={itemHead}>
                  <div style={itemMain}>
                    <div style={badges}>
                      <div style={{ ...titleText, fontSize: 14 }}>{row.title}</div>
                      {statusBadge(row.status)}
                      {mode === 'cabinet' && row.company_id && companyLookup[row.company_id]?.name && (
                        <span className="ops-pill" style={{ color:'#2563EB', background:'rgba(37,99,235,0.10)' }}>
                          {companyLookup[row.company_id].name}
                        </span>
                      )}
                      {row.requires_generated_document && (
                        <span className="ops-pill" style={{ color:'#7c3aed', background:'rgba(124,58,237,0.12)' }}>
                          Auto-doc
                        </span>
                      )}
                    </div>
                    <div style={{ ...copy, marginTop: 6, color: 'var(--ws-accent)' }}>{requestTypeLabel(row.request_type)}</div>
                    {row.details && <div style={{ ...copy, marginTop: 8, lineHeight: 1.6 }}>{row.details}</div>}
                  </div>

                  <div style={dateCol}>
                    <div>Creation: {formatDate(row.created_at)}</div>
                    <div>Mise a jour: {formatDate(row.updated_at)}</div>
                    {row.validated_at && <div>Validation: {formatDate(row.validated_at)}</div>}
                    {row.completed_at && <div>Cloture: {formatDate(row.completed_at)}</div>}
                  </div>
                </div>

                <ProgressLine status={row.status} />

                {canManage ? (
                  <div style={actionRow}>
                    {row.status === 'pending' && <button style={button} onClick={() => updateStatus(row, 'in_review')} disabled={saving}>Prendre en charge</button>}
                    {row.status === 'in_review' && <button style={{ ...button, background:'#0d9488' }} onClick={() => updateStatus(row, 'approved')} disabled={saving}>Valider</button>}
                    {['approved', 'in_progress'].includes(row.status) && <button style={{ ...button, background:'#7c3aed' }} onClick={() => updateStatus(row, 'ready')} disabled={saving}>Marquer prete</button>}
                    {row.status === 'approved' && <button style={button} onClick={() => updateStatus(row, 'in_progress')} disabled={saving}>Lancer preparation</button>}
                    {row.status === 'ready' && <button style={{ ...button, background:'#16a34a' }} onClick={() => updateStatus(row, 'delivered')} disabled={saving}>Livrer au client</button>}
                    {!['delivered', 'rejected'].includes(row.status) && <button style={{ ...button, background:'#dc2626' }} onClick={() => updateStatus(row, 'rejected')} disabled={saving}>Refuser</button>}
                  </div>
                ) : (
                  <div style={copy}>
                    {row.status === 'pending' && 'Votre demande a bien ete transmise a l equipe comptable.'}
                    {row.status === 'in_review' && 'La demande est en cours d analyse par le cabinet.'}
                    {row.status === 'approved' && 'La demande a ete validee et va etre traitee.'}
                    {row.status === 'in_progress' && 'Le document ou service est en preparation.'}
                    {row.status === 'ready' && 'La demande est prete. Livraison au client imminente.'}
                    {row.status === 'delivered' && 'Le traitement est termine et livre.'}
                    {row.status === 'rejected' && 'La demande a ete refusee. Contactez le cabinet si besoin.'}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
