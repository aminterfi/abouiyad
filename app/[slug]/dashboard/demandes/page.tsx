'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const card: React.CSSProperties = { background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:10, padding:16 }
const inp: React.CSSProperties = { width:'100%', padding:'10px 12px', border:'1px solid rgba(0,0,0,0.14)', borderRadius:7, background:'#f8f7f5', fontFamily:'inherit' }
const btn: React.CSSProperties = { border:'none', background:'#2563EB', color:'#fff', borderRadius:7, padding:'10px 14px', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }

export default function DemandesPage() {
  const [rows, setRows] = useState<any[]>([])
  const [requestType, setRequestType] = useState('g12')
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (!user.company_id) return
    const { data, error: err } = await supabase
      .from('service_requests')
      .select('*')
      .eq('company_id', user.company_id)
      .order('created_at', { ascending: false })
    if (err) {
      setError('Module demandes non initialisé dans la base.')
      return
    }
    setRows(data || [])
  }

  useEffect(() => { load() }, [])

  async function createRequest() {
    setError('')
    if (!title.trim()) return
    setSaving(true)
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const { error: err } = await supabase.from('service_requests').insert({
      request_type: requestType,
      title: title.trim(),
      details: details.trim() || null,
      status: 'pending',
      requires_generated_document: requestType === 'g12' || requestType === 'auto_document',
      company_id: user.company_id,
      created_by: user.id,
    })
    if (err) setError('Impossible de créer la demande.')
    setTitle('')
    setDetails('')
    setRequestType('g12')
    setSaving(false)
    load()
  }

  return (
    <div style={{display:'grid', gap:14}}>
      <div style={card}>
        <div style={{fontWeight:700, marginBottom:12}}>Nouvelle demande client</div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:10, marginBottom:10}}>
          <select style={inp} value={requestType} onChange={e=>setRequestType(e.target.value)}>
            <option value="g12">G12</option>
            <option value="auto_document">Document auto-généré</option>
            <option value="prepared_document">Document à préparer</option>
            <option value="other">Autre service</option>
          </select>
          <input style={inp} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Titre de la demande" />
        </div>
        <textarea style={{...inp, minHeight:84}} value={details} onChange={e=>setDetails(e.target.value)} placeholder="Détails et pièces nécessaires..." />
        {error && <div style={{marginTop:10, color:'#dc2626', fontSize:12}}>{error}</div>}
        <div style={{marginTop:10}}><button style={btn} onClick={createRequest} disabled={saving}>{saving ? '...' : 'Envoyer la demande'}</button></div>
      </div>

      <div style={card}>
        <div style={{fontWeight:700, marginBottom:10}}>Demandes en cours</div>
        {rows.length === 0 ? (
          <div style={{fontSize:13, color:'#6b6860'}}>Aucune demande.</div>
        ) : rows.map((r:any)=>(
          <div key={r.id} style={{padding:'10px 0', borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
            <div style={{display:'flex', justifyContent:'space-between', gap:10}}>
              <div style={{fontWeight:600}}>{r.title}</div>
              <div style={{fontSize:11, color:'#6b6860'}}>{r.status}</div>
            </div>
            <div style={{fontSize:11, color:'#2563EB', marginTop:3}}>{r.request_type}</div>
            {r.details && <div style={{fontSize:12, color:'#6b6860', marginTop:3}}>{r.details}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

