'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const card: React.CSSProperties = { background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:10, padding:16 }
const inp: React.CSSProperties = { width:'100%', padding:'10px 12px', border:'1px solid rgba(0,0,0,0.14)', borderRadius:7, background:'#f8f7f5', fontFamily:'inherit' }
const btn: React.CSSProperties = { border:'none', background:'#2563EB', color:'#fff', borderRadius:7, padding:'10px 14px', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }

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
    <span style={{ padding:'4px 9px', borderRadius:999, fontSize:11, fontWeight:700, color:meta.color, background:meta.bg, whiteSpace:'nowrap' }}>
      {meta.label}
    </span>
  )
}

function formatDate(value?: string | null) {
  if (!value) return '—'
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
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${STATUS_ORDER.length},1fr)`, gap:6, marginTop:10 }}>
      {STATUS_ORDER.map((step, index) => {
        const active = index <= activeIndex
        return (
          <div key={step} style={{ height:6, borderRadius:999, background:active ? '#2563EB' : 'rgba(0,0,0,0.08)', transition:'background .2s ease' }} />
        )
      })}
    </div>
  )
}

export default function DemandesPage() {
  const [rows, setRows] = useState<any[]>([])
  const [requestType, setRequestType] = useState('g12')
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [filter, setFilter] = useState('all')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)

  const canManage = ['owner', 'superadmin', 'admin', 'employe'].includes(user?.role)

  async function load() {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
    setUser(currentUser)
    if (!currentUser.company_id) return

    const { data, error: err } = await supabase
      .from('service_requests')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .order('created_at', { ascending: false })

    if (err) {
      setError('Module demandes non initialise dans la base.')
      return
    }

    setRows(data || [])
  }

  useEffect(() => { load() }, [])

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
  const counts = {
    total: rows.length,
    pending: rows.filter(r => r.status === 'pending').length,
    inProgress: rows.filter(r => ['in_review', 'approved', 'in_progress'].includes(r.status)).length,
    ready: rows.filter(r => r.status === 'ready').length,
    delivered: rows.filter(r => r.status === 'delivered').length,
  }

  return (
    <div style={{ display:'grid', gap:14 }}>
      <div style={{ display:'grid', gridTemplateColumns: canManage ? '1.15fr .85fr' : '1fr', gap:14 }}>
        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, gap:12 }}>
            <div>
              <div style={{ fontWeight:700 }}>Nouvelle demande client</div>
              <div style={{ fontSize:12, color:'#6b6860', marginTop:4 }}>
                G12, documents generes, documents prepares, ou service sur mesure.
              </div>
            </div>
            {statusBadge('pending')}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:10, marginBottom:10 }}>
            <select style={inp} value={requestType} onChange={e=>setRequestType(e.target.value)}>
              <option value="g12">G12</option>
              <option value="auto_document">Document auto-genere</option>
              <option value="prepared_document">Document a preparer</option>
              <option value="other">Autre service</option>
            </select>
            <input style={inp} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Titre de la demande" />
          </div>
          <textarea style={{ ...inp, minHeight:92 }} value={details} onChange={e=>setDetails(e.target.value)} placeholder="Details, echeance, documents necessaires..." />
          {error && <div style={{ marginTop:10, color:'#dc2626', fontSize:12 }}>{error}</div>}
          <div style={{ marginTop:10, display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
            <div style={{ fontSize:12, color:'#6b6860' }}>
              Les mises a jour de statut seront visibles au client.
            </div>
            <button style={btn} onClick={createRequest} disabled={saving}>{saving ? '...' : 'Envoyer la demande'}</button>
          </div>
        </div>

        {canManage && (
          <div style={{ ...card, display:'grid', gap:10 }}>
            <div style={{ fontWeight:700 }}>Vue comptable</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ background:'#f8f7f5', borderRadius:8, padding:12 }}>
                <div style={{ fontSize:11, color:'#6b6860' }}>Nouvelles</div>
                <div style={{ fontSize:24, fontWeight:800 }}>{counts.pending}</div>
              </div>
              <div style={{ background:'#f8f7f5', borderRadius:8, padding:12 }}>
                <div style={{ fontSize:11, color:'#6b6860' }}>En traitement</div>
                <div style={{ fontSize:24, fontWeight:800 }}>{counts.inProgress}</div>
              </div>
              <div style={{ background:'#f8f7f5', borderRadius:8, padding:12 }}>
                <div style={{ fontSize:11, color:'#6b6860' }}>Pretes</div>
                <div style={{ fontSize:24, fontWeight:800 }}>{counts.ready}</div>
              </div>
              <div style={{ background:'#f8f7f5', borderRadius:8, padding:12 }}>
                <div style={{ fontSize:11, color:'#6b6860' }}>Livrees</div>
                <div style={{ fontSize:24, fontWeight:800 }}>{counts.delivered}</div>
              </div>
            </div>
            <div style={{ fontSize:12, color:'#6b6860' }}>
              Utilisez les statuts pour tenir le client informe sans sortir de l'application.
            </div>
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, marginBottom:10, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontWeight:700 }}>{canManage ? 'Ordres et demandes clients' : 'Suivi des demandes'}</div>
            <div style={{ fontSize:12, color:'#6b6860', marginTop:4 }}>
              {canManage ? 'Traitez les demandes et faites avancer leur statut.' : "Suivez l'avancement de vos demandes en temps reel."}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {['all', 'pending', 'in_review', 'ready', 'delivered', 'rejected'].map(value => (
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
                {value === 'all' ? `Tout (${counts.total})` : STATUS_META[value]?.label || value}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ fontSize:13, color:'#6b6860' }}>Aucune demande pour ce filtre.</div>
        ) : (
          <div style={{ display:'grid', gap:10 }}>
            {filtered.map((row:any) => (
              <div key={row.id} style={{ border:'1px solid rgba(0,0,0,0.08)', borderRadius:10, padding:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <div style={{ fontWeight:700 }}>{row.title}</div>
                      {statusBadge(row.status)}
                      {row.requires_generated_document && (
                        <span style={{ fontSize:11, fontWeight:700, color:'#7c3aed', background:'rgba(124,58,237,0.12)', borderRadius:999, padding:'4px 9px' }}>
                          Auto-doc
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:11, color:'#2563EB', marginTop:4 }}>{requestTypeLabel(row.request_type)}</div>
                    {row.details && <div style={{ fontSize:12, color:'#6b6860', marginTop:8, lineHeight:1.5 }}>{row.details}</div>}
                  </div>
                  <div style={{ fontSize:11, color:'#6b6860', textAlign:'right' }}>
                    <div>Creation: {formatDate(row.created_at)}</div>
                    <div>Mise a jour: {formatDate(row.updated_at)}</div>
                    {row.validated_at && <div>Validation: {formatDate(row.validated_at)}</div>}
                    {row.completed_at && <div>Cloture: {formatDate(row.completed_at)}</div>}
                  </div>
                </div>

                <ProgressLine status={row.status} />

                {canManage ? (
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12 }}>
                    {row.status === 'pending' && <button style={btn} onClick={() => updateStatus(row, 'in_review')} disabled={saving}>Prendre en charge</button>}
                    {row.status === 'in_review' && <button style={{ ...btn, background:'#0d9488' }} onClick={() => updateStatus(row, 'approved')} disabled={saving}>Valider</button>}
                    {['approved', 'in_progress'].includes(row.status) && <button style={{ ...btn, background:'#7c3aed' }} onClick={() => updateStatus(row, 'ready')} disabled={saving}>Marquer prete</button>}
                    {row.status === 'approved' && <button style={{ ...btn, background:'#2563EB' }} onClick={() => updateStatus(row, 'in_progress')} disabled={saving}>Lancer preparation</button>}
                    {row.status === 'ready' && <button style={{ ...btn, background:'#16a34a' }} onClick={() => updateStatus(row, 'delivered')} disabled={saving}>Livrer au client</button>}
                    {!['delivered', 'rejected'].includes(row.status) && <button style={{ ...btn, background:'#dc2626' }} onClick={() => updateStatus(row, 'rejected')} disabled={saving}>Refuser</button>}
                  </div>
                ) : (
                  <div style={{ marginTop:12, fontSize:12, color:'#6b6860' }}>
                    {row.status === 'pending' && 'Votre demande a bien ete transmise a l equipe comptable.'}
                    {row.status === 'in_review' && 'La demande est en cours d analyse par le cabinet.'}
                    {row.status === 'approved' && 'La demande a ete validee et va etre traitee.'}
                    {row.status === 'in_progress' && 'Le document ou service est en preparation.'}
                    {row.status === 'ready' && 'La demande est prete. Livraison au client imminente.'}
                    {row.status === 'delivered' && 'Le traitement est termine et livre.'}
                    {row.status === 'rejected' && 'La demande a ete refusee. Contactez le cabinet si besoin.'}
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
