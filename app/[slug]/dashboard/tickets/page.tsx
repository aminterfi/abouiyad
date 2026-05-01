'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePathname } from 'next/navigation'
import { loadOperationalScope } from '@/lib/workspace-client'

const card: React.CSSProperties = { background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:10, padding:16 }
const inp: React.CSSProperties = { width:'100%', padding:'10px 12px', border:'1px solid rgba(0,0,0,0.14)', borderRadius:7, background:'#f8f7f5', fontFamily:'inherit' }
const btn: React.CSSProperties = { border:'none', background:'#2563EB', color:'#fff', borderRadius:7, padding:'10px 14px', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }

const TICKET_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  open: { label:'Ouvert', color:'#b45309', bg:'rgba(245,158,11,0.12)' },
  in_progress: { label:'En cours', color:'#2563EB', bg:'rgba(37,99,235,0.12)' },
  waiting_client: { label:'En attente client', color:'#7c3aed', bg:'rgba(124,58,237,0.12)' },
  resolved: { label:'Resolue', color:'#16a34a', bg:'rgba(22,163,74,0.12)' },
  closed: { label:'Fermee', color:'#166534', bg:'rgba(34,197,94,0.14)' },
}

const PRIORITY_META: Record<string, string> = {
  low: '#6b6860',
  normal: '#2563EB',
  high: '#d97706',
  urgent: '#dc2626',
}

function badge(status: string) {
  const meta = TICKET_STATUS[status] || TICKET_STATUS.open
  return <span style={{ padding:'4px 9px', borderRadius:999, fontSize:11, fontWeight:700, color:meta.color, background:meta.bg }}>{meta.label}</span>
}

function formatDate(value?: string | null) {
  if (!value) return '—'
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
  const canManage = mode === 'cabinet' || user?.is_platform_admin === true

  async function load() {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
    setUser(currentUser)
    if (!currentUser.company_id) return
    const scope = await loadOperationalScope(currentUser.company_id, pathname)
    setMode(scope.mode)
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
    setTitle('')
    setDescription('')
    setPriority('normal')
    setSaving(false)
    load()
  }

  async function updateStatus(ticket: any, nextStatus: string) {
    if (!canManage) return
    setSaving(true)
    const { error: err } = await supabase
      .from('support_tickets')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', ticket.id)
    if (err) setError('Impossible de mettre a jour le ticket.')
    setSaving(false)
    load()
  }

  const filtered = tickets.filter(ticket => filter === 'all' || ticket.status === filter)
  const companyLookup = Object.fromEntries(managedCompanies.map((company: any) => [company.id, company]))

  return (
    <div style={{ display:'grid', gap:14 }}>
      <div style={{ display:'grid', gridTemplateColumns: canManage ? '1.05fr .95fr' : '1fr', gap:14 }}>
        <div style={card}>
          <div style={{ fontWeight:700, marginBottom:12 }}>Nouveau ticket client</div>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:10, marginBottom:10 }}>
            <input style={inp} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Objet du ticket" />
            <select style={inp} value={priority} onChange={e=>setPriority(e.target.value)}>
              <option value="low">Priorite basse</option>
              <option value="normal">Priorite normale</option>
              <option value="high">Priorite haute</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <textarea style={{ ...inp, minHeight:92 }} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Decrivez la demande ou le probleme..." />
          {error && <div style={{ marginTop:10, color:'#dc2626', fontSize:12 }}>{error}</div>}
          <div style={{ marginTop:10, display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
            <div style={{ fontSize:12, color:'#6b6860' }}>Le client voit ensuite le statut du ticket.</div>
            <button style={btn} onClick={createTicket} disabled={saving}>{saving ? '...' : 'Creer ticket'}</button>
          </div>
        </div>

        {canManage && (
          <div style={{ ...card, display:'grid', gap:10 }}>
            <div style={{ fontWeight:700 }}>Vue support</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ background:'#f8f7f5', borderRadius:8, padding:12 }}>
                <div style={{ fontSize:11, color:'#6b6860' }}>Ouverts</div>
                <div style={{ fontSize:24, fontWeight:800 }}>{tickets.filter(t => t.status === 'open').length}</div>
              </div>
              <div style={{ background:'#f8f7f5', borderRadius:8, padding:12 }}>
                <div style={{ fontSize:11, color:'#6b6860' }}>En cours</div>
                <div style={{ fontSize:24, fontWeight:800 }}>{tickets.filter(t => t.status === 'in_progress').length}</div>
              </div>
              <div style={{ background:'#f8f7f5', borderRadius:8, padding:12 }}>
                <div style={{ fontSize:11, color:'#6b6860' }}>Attente client</div>
                <div style={{ fontSize:24, fontWeight:800 }}>{tickets.filter(t => t.status === 'waiting_client').length}</div>
              </div>
              <div style={{ background:'#f8f7f5', borderRadius:8, padding:12 }}>
                <div style={{ fontSize:11, color:'#6b6860' }}>Resolus</div>
                <div style={{ fontSize:24, fontWeight:800 }}>{tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, marginBottom:10, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontWeight:700 }}>{canManage ? 'Tickets clients a traiter' : 'Suivi des tickets'}</div>
            <div style={{ fontSize:12, color:'#6b6860', marginTop:4 }}>
              {canManage ? 'Pilotez le support avec des statuts visibles par le client.' : 'Suivez la prise en charge de vos tickets.'}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {['all', 'open', 'in_progress', 'waiting_client', 'resolved', 'closed'].map(value => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                style={{
                  border:'1px solid rgba(0,0,0,0.12)',
                  background: filter === value ? '#1a1916' : '#fff',
                  color: filter === value ? '#fff' : '#1a1916',
                  borderRadius:999,
                  padding:'7px 10px',
                  fontSize:12,
                  cursor:'pointer',
                  fontFamily:'inherit'
                }}
              >
                {value === 'all' ? 'Tout' : TICKET_STATUS[value]?.label || value}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ fontSize:13, color:'#6b6860' }}>Aucun ticket pour ce filtre.</div>
        ) : (
          <div style={{ display:'grid', gap:10 }}>
            {filtered.map((ticket:any) => (
              <div key={ticket.id} style={{ border:'1px solid rgba(0,0,0,0.08)', borderRadius:10, padding:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <div style={{ fontWeight:700 }}>{ticket.title}</div>
                      {badge(ticket.status)}
                      {mode === 'cabinet' && ticket.company_id && companyLookup[ticket.company_id]?.name && (
                        <span style={{ fontSize:11, fontWeight:700, color:'#2563EB', background:'rgba(37,99,235,0.10)', borderRadius:999, padding:'4px 9px' }}>
                          {companyLookup[ticket.company_id].name}
                        </span>
                      )}
                      <span style={{ fontSize:11, fontWeight:700, color:PRIORITY_META[ticket.priority] || '#2563EB', background:'rgba(0,0,0,0.04)', borderRadius:999, padding:'4px 9px' }}>
                        {ticket.priority}
                      </span>
                    </div>
                    {ticket.description && <div style={{ fontSize:12, color:'#6b6860', marginTop:8, lineHeight:1.5 }}>{ticket.description}</div>}
                  </div>
                  <div style={{ fontSize:11, color:'#6b6860', textAlign:'right' }}>
                    <div>Creation: {formatDate(ticket.created_at)}</div>
                    <div>Mise a jour: {formatDate(ticket.updated_at)}</div>
                  </div>
                </div>

                {canManage ? (
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12 }}>
                    {ticket.status === 'open' && <button style={btn} onClick={() => updateStatus(ticket, 'in_progress')} disabled={saving}>Prendre en charge</button>}
                    {['open', 'in_progress'].includes(ticket.status) && <button style={{ ...btn, background:'#7c3aed' }} onClick={() => updateStatus(ticket, 'waiting_client')} disabled={saving}>Attente client</button>}
                    {['open', 'in_progress', 'waiting_client'].includes(ticket.status) && <button style={{ ...btn, background:'#16a34a' }} onClick={() => updateStatus(ticket, 'resolved')} disabled={saving}>Marquer resolu</button>}
                    {ticket.status === 'resolved' && <button style={{ ...btn, background:'#166534' }} onClick={() => updateStatus(ticket, 'closed')} disabled={saving}>Fermer</button>}
                  </div>
                ) : (
                  <div style={{ marginTop:12, fontSize:12, color:'#6b6860' }}>
                    {ticket.status === 'open' && 'Le ticket a bien ete recu par le cabinet.'}
                    {ticket.status === 'in_progress' && 'Le ticket est en cours de traitement.'}
                    {ticket.status === 'waiting_client' && 'Le cabinet attend un retour ou un document de votre part.'}
                    {ticket.status === 'resolved' && 'Le probleme semble resolu.'}
                    {ticket.status === 'closed' && 'Le ticket est cloture.'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
