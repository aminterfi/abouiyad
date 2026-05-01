'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePathname } from 'next/navigation'
import { loadOperationalScope } from '@/lib/workspace-client'

const card: React.CSSProperties = { background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:10, padding:16 }
const inp: React.CSSProperties = { width:'100%', padding:'10px 12px', border:'1px solid rgba(0,0,0,0.14)', borderRadius:7, background:'#f8f7f5', fontFamily:'inherit' }
const btn: React.CSSProperties = { border:'none', background:'#2563EB', color:'#fff', borderRadius:7, padding:'10px 14px', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }

export default function DocumentsPage() {
  const pathname = usePathname()
  const [rows, setRows] = useState<any[]>([])
  const [managedCompanies, setManagedCompanies] = useState<any[]>([])
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [direction, setDirection] = useState<'incoming'|'outgoing'>('incoming')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'client' | 'cabinet'>('client')

  async function load() {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (!user.company_id) return
    const scope = await loadOperationalScope(user.company_id, pathname)
    setMode(scope.mode)
    setManagedCompanies(scope.companies)
    const { data, error: err } = await supabase
      .from('client_documents')
      .select('*')
      .in('company_id', scope.companyIds)
      .order('created_at', { ascending: false })
    if (err) {
      setError('Module documents non initialisé dans la base.')
      return
    }
    setRows(data || [])
  }

  useEffect(() => { load() }, [pathname])

  const companyLookup = Object.fromEntries(managedCompanies.map((company: any) => [company.id, company]))

  async function saveDocument() {
    setError('')
    if (!name.trim()) return
    setSaving(true)
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const { error: err } = await supabase.from('client_documents').insert({
      name: name.trim(),
      direction,
      file_url: url.trim() || null,
      status: 'shared',
      company_id: user.company_id,
      created_by: user.id,
    })
    if (err) setError('Impossible d’enregistrer le document.')
    setName('')
    setUrl('')
    setDirection('incoming')
    setSaving(false)
    load()
  }

  return (
    <div style={{display:'grid', gap:14}}>
      <div style={card}>
        <div style={{fontWeight:700, marginBottom:12}}>Espace dépôt / réception</div>
        <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:10, marginBottom:10}}>
          <input style={inp} value={name} onChange={e=>setName(e.target.value)} placeholder="Nom du document" />
          <select style={inp} value={direction} onChange={e=>setDirection(e.target.value as any)}>
            <option value="incoming">Reçu du client</option>
            <option value="outgoing">Envoyé au client</option>
          </select>
        </div>
        <input style={inp} value={url} onChange={e=>setUrl(e.target.value)} placeholder="URL fichier (optionnel)" />
        {error && <div style={{marginTop:10, color:'#dc2626', fontSize:12}}>{error}</div>}
        <div style={{marginTop:10}}><button style={btn} onClick={saveDocument} disabled={saving}>{saving ? '...' : 'Ajouter document'}</button></div>
      </div>

      <div style={card}>
        <div style={{fontWeight:700, marginBottom:10}}>Documents échangés</div>
        {rows.length === 0 ? (
          <div style={{fontSize:13, color:'#6b6860'}}>Aucun document.</div>
        ) : rows.map((d:any)=>(
            <div key={d.id} style={{padding:'10px 0', borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
              <div style={{display:'flex', justifyContent:'space-between', gap:10}}>
              <div>
                <div style={{fontWeight:600}}>{d.name}</div>
                {mode === 'cabinet' && d.company_id && companyLookup[d.company_id]?.name && (
                  <div style={{fontSize:11, color:'#2563EB', marginTop:4}}>{companyLookup[d.company_id].name}</div>
                )}
              </div>
              <div style={{fontSize:11, color:'#6b6860'}}>{d.direction}</div>
              </div>
            {d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" style={{fontSize:12, color:'#2563EB'}}>Ouvrir le fichier</a>}
          </div>
        ))}
      </div>
    </div>
  )
}
