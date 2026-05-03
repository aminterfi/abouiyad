'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePathname } from 'next/navigation'
import { loadOperationalScope } from '@/lib/workspace-client'
import { sendWorkspaceEmailNotification } from '@/lib/workspace-email'
import { useRealtime } from '@/lib/useRealtime'
import { fetchCabinetTickets, getSlugFromPathname, updateCabinetOperationalItem } from '@/lib/cabinet-api'

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
const fieldGrid: React.CSSProperties = { display:'grid', gap:10 }
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

const TICKET_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  open: { label:'Ouvert', color:'#b45309', bg:'rgba(245,158,11,0.12)' },
  in_progress: { label:'En cours', color:'#2563EB', bg:'rgba(37,99,235,0.12)' },
  waiting_client: { label:'En attente client', color:'#7c3aed', bg:'rgba(124,58,237,0.12)' },
  resolved: { label:'Resolue', color:'#16a34a', bg:'rgba(22,163,74,0.12)' },
  closed: { label:'Fermee', color:'#166534', bg:'rgba(34,197,94,0.14)' },
}

const PRIORITY_META: Record<string, { color: string; bg: string }> = {
  low: { color:'#6b6860', bg:'rgba(107,104,96,0.10)' },
  normal: { color:'#2563EB', bg:'rgba(37,99,235,0.10)' },
  high: { color:'#d97706', bg:'rgba(217,119,6,0.12)' },
  urgent: { color:'#dc2626', bg:'rgba(220,38,38,0.12)' },
}

function badge(status: string) {
  const meta = TICKET_STATUS[status] || TICKET_STATUS.open
  return <span className="ops-pill" style={{ color:meta.color, background:meta.bg }}>{meta.label}</span>
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('fr-DZ')
}

export default function TicketsPage() {
  const pathname = usePathname()
  const [tickets, setTickets] = useState<any[]>([])
  const [managedCompanies, setManagedCompanies] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('normal')
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
    if (scope.mode === 'cabinet') {
      const slug = getSlugFromPathname(pathname)
      try {
        const data = await fetchCabinetTickets(slug)
        setManagedCompanies(data.companies || [])
        setTickets(data.rows || [])
        setError('')
        return
      } catch {
        setManagedCompanies(scope.companies)
        const { data, error: err } = await supabase
          .from('support_tickets')
          .select('*')
          .in('company_id', scope.companyIds)
          .order('created_at', { ascending: false })

        if (err) {
          setTickets([])
          setError('Tickets cabinet indisponibles. Verifiez SUPABASE_SERVICE_ROLE_KEY dans Vercel/local.')
          return
        }

        setTickets(data || [])
        setError('')
        return
      }
    }

    setManagedCompanies(scope.companies)
    const { data, error: err } = await supabase
      .from('support_tickets')
      .select('*')
      .in('company_id', scope.companyIds)
      .order('created_at', { ascending: false })
    if (err) {
      setError('Module tickets non initialise dans la base.')
      return
    }
    setTickets(data || [])
  }

  useEffect(() => { load() }, [pathname])
  useRealtime(['support_tickets'], load, { intervalMs: 4000, deps: [pathname] })

  async function createTicket() {
    setError('')
    if (!title.trim()) return
    setSaving(true)
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
    const { error: err } = await supabase.from('support_tickets').insert({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      status: 'open',
      company_id: currentUser.company_id,
      created_by: currentUser.id,
    })
    if (err) setError('Impossible de creer le ticket.')
    else if (mode === 'client') {
      sendWorkspaceEmailNotification({
        scope: 'cabinet',
        kind: 'ticket',
        action: 'created',
        companyId: currentUser.company_id,
        title: title.trim(),
        status: 'open',
        actorName: currentUser.full_name || currentUser.email || null,
      })
    }
    setTitle('')
    setDescription('')
    setPriority('normal')
    setSaving(false)
    load()
  }

  async function updateStatus(ticket: any, nextStatus: string) {
    if (!canManage) return
    setSaving(true)
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
    try {
      const payload = {
        status: nextStatus,
        updated_at: new Date().toISOString(),
      }
      const slug = getSlugFromPathname(pathname)

      try {
        await updateCabinetOperationalItem(slug, 'ticket', ticket.id, payload)
      } catch {
        const { error: err } = await supabase
          .from('support_tickets')
          .update(payload)
          .eq('id', ticket.id)
        if (err) throw err
      }

      sendWorkspaceEmailNotification({
        scope: 'client',
        kind: 'ticket',
        action: 'status_updated',
        companyId: ticket.company_id,
        title: ticket.title,
        status: nextStatus,
        actorName: currentUser.full_name || currentUser.email || null,
      })
    } catch {
      setError('Impossible de mettre a jour le ticket.')
    }
    setSaving(false)
    load()
  }

  const filtered = tickets.filter((ticket) => filter === 'all' || ticket.status === filter)
  const companyLookup = Object.fromEntries(managedCompanies.map((company: any) => [company.id, company]))
  const openCount = tickets.filter((ticket) => ticket.status === 'open').length
  const progressCount = tickets.filter((ticket) => ticket.status === 'in_progress').length
  const waitingCount = tickets.filter((ticket) => ticket.status === 'waiting_client').length
  const resolvedCount = tickets.filter((ticket) => ['resolved', 'closed'].includes(ticket.status)).length

  return (
    <div style={page}>
      <div style={{ ...grid, gridTemplateColumns: canManage ? 'minmax(0, 1.05fr) minmax(320px, 0.95fr)' : '1fr' }}>
        <section style={card}>
          <div style={head}>
            <div>
              <div style={titleText}>Nouveau ticket client</div>
              <div style={copy}>Le support client reste trace et visible dans le workspace.</div>
            </div>
            {badge('open')}
          </div>

          <div style={{ ...fieldGrid, gridTemplateColumns:'2fr 1fr' }}>
            <input style={field} value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Objet du ticket" />
            <select style={field} value={priority} onChange={(e)=>setPriority(e.target.value)}>
              <option value="low">Priorite basse</option>
              <option value="normal">Priorite normale</option>
              <option value="high">Priorite haute</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <textarea style={textarea} value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Decrivez la demande ou le probleme..." />

          {error && <div className="docs-error"><span>{error}</span></div>}

          <div style={actions}>
            <div style={copy}>Le client voit ensuite le statut du ticket.</div>
            <button style={button} onClick={createTicket} disabled={saving}>{saving ? '...' : 'Creer ticket'}</button>
          </div>
        </section>

        {canManage && (
          <section style={softCard}>
            <div style={titleText}>Vue support</div>
            <div style={statsGrid}>
              <div style={stat}>
                <div style={statLabel}>Ouverts</div>
                <div style={statValue}>{openCount}</div>
              </div>
              <div style={stat}>
                <div style={statLabel}>En cours</div>
                <div style={statValue}>{progressCount}</div>
              </div>
              <div style={stat}>
                <div style={statLabel}>Attente client</div>
                <div style={statValue}>{waitingCount}</div>
              </div>
              <div style={stat}>
                <div style={statLabel}>Resolus</div>
                <div style={statValue}>{resolvedCount}</div>
              </div>
            </div>
            <div style={copy}>Pilotez le support avec des statuts visibles par le client.</div>
          </section>
        )}
      </div>

      <section style={card}>
        <div style={head}>
          <div>
            <div style={titleText}>{canManage ? 'Tickets clients a traiter' : 'Suivi des tickets'}</div>
            <div style={copy}>
              {canManage ? 'Pilotez le support avec des statuts visibles par le client.' : 'Suivez la prise en charge de vos tickets.'}
            </div>
          </div>
          <div style={filterRow}>
            {['all', 'open', 'in_progress', 'waiting_client', 'resolved', 'closed'].map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                style={filterButton(filter === value)}
              >
                {value === 'all' ? 'Tout' : TICKET_STATUS[value]?.label || value}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={copy}>Aucun ticket pour ce filtre.</div>
        ) : (
          <div style={list}>
            {filtered.map((ticket: any) => (
              <article key={ticket.id} style={item}>
                <div style={itemHead}>
                  <div style={itemMain}>
                    <div style={badges}>
                      <div style={{ ...titleText, fontSize: 14 }}>{ticket.title}</div>
                      {badge(ticket.status)}
                      {mode === 'cabinet' && ticket.company_id && companyLookup[ticket.company_id]?.name && (
                        <span className="ops-pill" style={{ color:'#2563EB', background:'rgba(37,99,235,0.10)' }}>
                          {companyLookup[ticket.company_id].name}
                        </span>
                      )}
                      <span className="ops-pill" style={{ color:PRIORITY_META[ticket.priority]?.color || '#2563EB', background:PRIORITY_META[ticket.priority]?.bg || 'rgba(37,99,235,0.10)' }}>
                        {ticket.priority}
                      </span>
                    </div>
                    {ticket.description && <div style={{ ...copy, marginTop: 8, lineHeight: 1.6 }}>{ticket.description}</div>}
                  </div>

                  <div style={dateCol}>
                    <div>Creation: {formatDate(ticket.created_at)}</div>
                    <div>Mise a jour: {formatDate(ticket.updated_at)}</div>
                  </div>
                </div>

                {canManage ? (
                  <div style={actionRow}>
                    {ticket.status === 'open' && <button style={button} onClick={() => updateStatus(ticket, 'in_progress')} disabled={saving}>Prendre en charge</button>}
                    {['open', 'in_progress'].includes(ticket.status) && <button style={{ ...button, background:'#7c3aed' }} onClick={() => updateStatus(ticket, 'waiting_client')} disabled={saving}>Attente client</button>}
                    {['open', 'in_progress', 'waiting_client'].includes(ticket.status) && <button style={{ ...button, background:'#16a34a' }} onClick={() => updateStatus(ticket, 'resolved')} disabled={saving}>Marquer resolu</button>}
                    {ticket.status === 'resolved' && <button style={{ ...button, background:'#1f2937' }} onClick={() => updateStatus(ticket, 'closed')} disabled={saving}>Fermer</button>}
                  </div>
                ) : (
                  <div style={copy}>
                    {ticket.status === 'open' && 'Le ticket a bien ete recu par le cabinet.'}
                    {ticket.status === 'in_progress' && 'Le ticket est en cours de traitement.'}
                    {ticket.status === 'waiting_client' && 'Le cabinet attend un retour ou un document de votre part.'}
                    {ticket.status === 'resolved' && 'Le probleme semble resolu.'}
                    {ticket.status === 'closed' && 'Le ticket est cloture.'}
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
