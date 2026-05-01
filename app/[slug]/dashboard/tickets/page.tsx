'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const card: React.CSSProperties = { background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:10, padding:16 }
const inp: React.CSSProperties = { width:'100%', padding:'10px 12px', border:'1px solid rgba(0,0,0,0.14)', borderRadius:7, background:'#f8f7f5', fontFamily:'inherit' }
const btn: React.CSSProperties = { border:'none', background:'#2563EB', color:'#fff', borderRadius:7, padding:'10px 14px', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('normal')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (!user.company_id) return
    const { data, error: err } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('company_id', user.company_id)
      .order('created_at', { ascending: false })
    if (err) {
      setError('Module tickets non initialisé dans la base.')
      return
    }
    setTickets(data || [])
  }

  useEffect(() => { load() }, [])

  async function createTicket() {
    setError('')
    if (!title.trim()) return
    setSaving(true)
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const { error: err } = await supabase.from('support_tickets').insert({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      status: 'open',
      company_id: user.company_id,
      created_by: user.id,
    })
    if (err) setError('Impossible de créer le ticket.')
    setTitle('')
    setDescription('')
    setPriority('normal')
    setSaving(false)
    load()
  }

  return (
    <div style={{display:'grid', gap:14}}>
      <div style={card}>
        <div style={{fontWeight:700, marginBottom:12}}>Nouveau ticket client</div>
        <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:10, marginBottom:10}}>
          <input style={inp} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Objet du ticket" />
          <select style={inp} value={priority} onChange={e=>setPriority(e.target.value)}>
            <option value="low">Priorité basse</option>
            <option value="normal">Priorité normale</option>
            <option value="high">Priorité haute</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <textarea style={{...inp, minHeight:84}} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Décrivez la demande..." />
        {error && <div style={{marginTop:10, color:'#dc2626', fontSize:12}}>{error}</div>}
        <div style={{marginTop:10}}><button style={btn} onClick={createTicket} disabled={saving}>{saving ? '...' : 'Créer ticket'}</button></div>
      </div>

      <div style={card}>
        <div style={{fontWeight:700, marginBottom:10}}>Suivi des tickets</div>
        {tickets.length === 0 ? (
          <div style={{fontSize:13, color:'#6b6860'}}>Aucun ticket pour le moment.</div>
        ) : tickets.map((t:any)=>(
          <div key={t.id} style={{padding:'10px 0', borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
            <div style={{display:'flex', justifyContent:'space-between', gap:10}}>
              <div style={{fontWeight:600}}>{t.title}</div>
              <div style={{fontSize:11, color:'#6b6860'}}>{t.status}</div>
            </div>
            {t.description && <div style={{fontSize:12, color:'#6b6860', marginTop:4}}>{t.description}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

