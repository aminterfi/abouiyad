'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function dzd(v: number) { return (v||0).toLocaleString('fr-DZ')+' DZD' }

const inp: React.CSSProperties = { width:'100%', background:'#f0eeea', border:'1px solid rgba(0,0,0,0.14)', borderRadius:6, padding:'9px 12px', fontSize:13, color:'#1a1916', fontFamily:'Outfit,sans-serif', outline:'none' }
const lbl: React.CSSProperties = { display:'block', fontSize:12, fontWeight:500, color:'#6b6860', marginBottom:5 }
const btnP: React.CSSProperties = { background:'#2563EB', color:'#fff', border:'none', borderRadius:6, padding:'9px 18px', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'Outfit,sans-serif', display:'inline-flex', alignItems:'center', gap:6 }
const btnG: React.CSSProperties = { background:'transparent', color:'#6b6860', border:'1px solid rgba(0,0,0,0.14)', borderRadius:6, padding:'9px 18px', fontSize:13, cursor:'pointer', fontFamily:'Outfit,sans-serif' }
const btnSm: React.CSSProperties = { padding:'5px 10px', fontSize:12, borderRadius:5, cursor:'pointer', fontFamily:'Outfit,sans-serif' }

const ALL_ROLES = [
  { value:'superadmin', label:'Super Admin', desc:'Contrôle total — Seul compte non supprimable', color:'#7c3aed', icon:'👑' },
  { value:'admin', label:'Administrateur', desc:'Gère utilisateurs + opérations courantes', color:'#2563EB', icon:'⚙️' },
  { value:'employe', label:'Employé', desc:'Créer clients, factures et paiements', color:'#0d9488', icon:'👤' },
  { value:'lecteur', label:'Lecteur', desc:'Consultation uniquement — lecture seule', color:'#6b6860', icon:'👁️' },
]

export default function UtilisateursPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('tous')
  const [form, setForm] = useState({ full_name:'', username:'', email:'', phone:'', role:'employe', password:'', salary:'', hiring_date:'' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) setCurrentUser(JSON.parse(u))
    fetch()
  }, [])

  async function fetch() {
    setLoading(true)
    const u = localStorage.getItem('user')
    if (!u) return
    const parsed = JSON.parse(u)
    
    // Filtrer par company_id
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', parsed.company_id)
      .order('created_at',{ascending:false})
    
    setUsers(data||[])
    setLoading(false)
  }

  // Permissions : owner ET superadmin ont les mêmes droits (Super Admin)
  const isSuperAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'owner'
  const isAdmin = currentUser?.role === 'admin'
  const canAccess = isSuperAdmin || isAdmin

  const creatableRoles = isSuperAdmin 
    ? ALL_ROLES.filter(r => r.value !== 'superadmin')
    : isAdmin 
    ? ALL_ROLES.filter(r => r.value === 'employe' || r.value === 'lecteur')
    : []

  function openNew() {
    setEditing(null)
    setForm({ full_name:'', username:'', email:'', phone:'', role:creatableRoles[0]?.value||'employe', password:'', salary:'', hiring_date:'' })
    setError('')
    setShowForm(true)
  }

  function openEdit(u: any) {
    if (isAdmin && (u.role === 'superadmin' || u.role === 'admin')) return
    setEditing(u)
    setForm({
      full_name: u.full_name||'', username: u.username||'', email: u.email||'',
      phone: u.phone||'', role: u.role||'employe', password: '',
      salary: u.salary?.toString()||'', hiring_date: u.hiring_date||''
    })
    setError('')
    setShowForm(true)
  }

  async function save() {
    setError('')
    if (!form.full_name||!form.username) { setError('Nom et username obligatoires'); return }
    if (!editing && !form.password) { setError('Mot de passe obligatoire pour un nouvel utilisateur'); return }
    if (form.role === 'superadmin') { setError('Impossible de créer un Super Admin'); return }
    
    if (isAdmin && !['employe','lecteur'].includes(form.role)) { setError('Vous ne pouvez créer que des Employés ou Lecteurs'); return }

    setSaving(true)
    const data: any = {
      full_name: form.full_name,
      username: form.username,
      email: form.email||null,
      phone: form.phone||null,
      role: form.role,
      salary: parseFloat(form.salary)||0,
      hiring_date: form.hiring_date||null,
      company_id: currentUser?.company_id,
    }
    if (!editing) data.password_hash = form.password
    try {
      if (editing) {
        await supabase.from('users').update(data).eq('id', editing.id)
      } else {
        data.created_by = currentUser?.id
        await supabase.from('users').insert(data)
      }
      setShowForm(false)
      fetch()
    } catch (e: any) {
      setError(e.message||'Erreur')
    }
    setSaving(false)
  }

  async function toggleActive(u: any) {
    if (u.role === 'superadmin') { alert('Le Super Admin ne peut jamais être désactivé'); return }
    if (isAdmin && u.role === 'admin') { alert('Les admins ne peuvent pas désactiver d\'autres admins'); return }
    await supabase.from('users').update({ is_active: !u.is_active }).eq('id', u.id)
    fetch()
  }

  async function deleteUser(u: any) {
    if (u.role === 'superadmin') { alert('Le Super Admin ne peut jamais être supprimé'); return }
    if (!isSuperAdmin && u.role === 'admin') { alert('Seul le Super Admin peut supprimer un Admin'); return }
    if (!confirm(`Supprimer définitivement ${u.full_name} ?\n\nCette action est irréversible.`)) return
    await supabase.from('users').delete().eq('id', u.id)
    fetch()
  }

  if (!canAccess) {
    return (
      <div style={{textAlign:'center',padding:60,color:'#a8a69e'}}>
        <div style={{fontSize:40,marginBottom:14}}>🔒</div>
        <div style={{fontSize:16,fontWeight:600,color:'#6b6860'}}>Accès refusé</div>
        <div style={{fontSize:13,marginTop:6}}>Cette section est réservée aux administrateurs</div>
      </div>
    )
  }

  const filtered = users.filter(u => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.username?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'tous' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const totalSalaires = users.filter(u => u.is_active).reduce((s,u) => s + (u.salary||0), 0)
  const roleInfo = (r: string) => ALL_ROLES.find(x=>x.value===r) || { color:'#6b6860', label:r, icon:'?' }

  if (showForm) {
    return (
      <div style={{minHeight:'100vh',background:'#f5f4f1',margin:-22,padding:0,fontFamily:'Outfit,sans-serif'}}>
        <div style={{background:'#1a1916',padding:'0 28px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:50}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <button onClick={()=>setShowForm(false)} style={{background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',borderRadius:6,padding:'7px 14px',cursor:'pointer',fontFamily:'Outfit,sans-serif',fontSize:13,display:'flex',alignItems:'center',gap:6}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              Retour
            </button>
            <div style={{width:1,height:22,background:'rgba(255,255,255,0.15)'}}/>
            <div>
              <div style={{color:'#fff',fontSize:14,fontWeight:600}}>{editing?'Modifier l\'utilisateur':'Créer un utilisateur'}</div>
              <div style={{color:'rgba(255,255,255,0.35)',fontSize:10}}>ABOU IYAD — RS Comptabilité</div>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button style={btnG} onClick={()=>setShowForm(false)}>Annuler</button>
            <button style={btnP} onClick={save} disabled={saving}>{saving?'...':(editing?'Mettre à jour':'Créer')}</button>
          </div>
        </div>

        <div style={{maxWidth:820,margin:'0 auto',padding:'32px 24px'}}>
          {error && <div style={{background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'#dc2626',marginBottom:20}}>{error}</div>}

          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'20px 24px',marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:14}}>Identité</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lbl}>Nom complet *</label>
                <input autoFocus style={inp} placeholder="Prénom et nom" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/>
              </div>
              <div>
                <label style={lbl}>Nom d'utilisateur *</label>
                <input style={inp} placeholder="prenom.nom" value={form.username} onChange={e=>setForm({...form,username:e.target.value.toLowerCase().replace(/\s/g,'.')})}/>
              </div>
              <div>
                <label style={lbl}>Email</label>
                <input type="email" style={inp} placeholder="email@..." value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
              </div>
              <div>
                <label style={lbl}>Téléphone</label>
                <input style={inp} placeholder="0550 000 000" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
              </div>
              <div>
                <label style={lbl}>{editing?'Nouveau mot de passe (optionnel)':'Mot de passe *'}</label>
                <input type="password" style={inp} placeholder="••••••••" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
              </div>
            </div>
          </div>

          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'20px 24px',marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:4}}>Rôle & Permissions</div>
            <div style={{fontSize:11,color:'#a8a69e',marginBottom:14}}>
              {isSuperAdmin ? 'En tant que Super Admin, vous pouvez créer tous les rôles sauf Super Admin' : 'En tant qu\'Administrateur, vous pouvez créer uniquement des Employés ou Lecteurs'}
            </div>
            <div style={{display:'grid',gridTemplateColumns:`repeat(${creatableRoles.length},1fr)`,gap:10}}>
              {creatableRoles.map(r=>(
                <button key={r.value} onClick={()=>setForm({...form,role:r.value})}
                  style={{padding:'16px',borderRadius:10,border:`2px solid ${form.role===r.value?r.color:'rgba(0,0,0,0.1)'}`,background:form.role===r.value?`${r.color}0f`:'#fff',cursor:'pointer',textAlign:'left',fontFamily:'Outfit,sans-serif'}}>
                  <div style={{fontSize:22,marginBottom:6}}>{r.icon}</div>
                  <div style={{fontSize:13,fontWeight:700,color:form.role===r.value?r.color:'#1a1916',marginBottom:4}}>{r.label}</div>
                  <div style={{fontSize:11,color:'#6b6860',lineHeight:1.4}}>{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'20px 24px',marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:14}}>Informations emploi</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div>
                <label style={lbl}>Salaire (DZD)</label>
                <div style={{position:'relative'}}>
                  <input type="number" style={{...inp,paddingRight:50}} placeholder="0" value={form.salary} onChange={e=>setForm({...form,salary:e.target.value})}/>
                  <div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'#a8a69e',fontWeight:600}}>DZD</div>
                </div>
              </div>
              <div>
                <label style={lbl}>Date d'embauche</label>
                <input type="date" style={inp} value={form.hiring_date} onChange={e=>setForm({...form,hiring_date:e.target.value})}/>
              </div>
            </div>
          </div>

          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button style={btnG} onClick={()=>setShowForm(false)}>Annuler</button>
            <button style={btnP} onClick={save} disabled={saving}>{saving?'...':(editing?'Mettre à jour':'Créer l\'utilisateur')}</button>
          </div>
          <div style={{textAlign:'center',marginTop:32,fontSize:11,color:'#c8c6be'}}>Développé par RS Comptabilité</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:17,fontWeight:600,letterSpacing:'-.3px'}}>Utilisateurs</div>
          <div style={{fontSize:12,color:'#a8a69e',marginTop:2}}>{users.length} utilisateur(s) · {users.filter(u=>u.is_active).length} actif(s)</div>
        </div>
        {creatableRoles.length > 0 && (
          <button style={btnP} onClick={openNew}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nouvel utilisateur
          </button>
        )}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[
          { label:'Total', val:users.length, color:'#1a1916' },
          { label:'Actifs', val:users.filter(u=>u.is_active).length, color:'#16a34a' },
          { label:'Inactifs', val:users.filter(u=>!u.is_active).length, color:'#dc2626' },
          { label:'Masse salariale', val:dzd(totalSalaires), color:'#2563EB', mono:true },
        ].map((s:any,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'14px 18px'}}>
            <div style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:18,fontWeight:700,color:s.color,fontFamily:s.mono?'JetBrains Mono,monospace':'Outfit,sans-serif'}}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:7,background:'#fff',border:'1px solid rgba(0,0,0,0.14)',borderRadius:5,padding:'7px 11px',flex:1,minWidth:180,maxWidth:280}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a8a69e" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input style={{background:'none',border:'none',outline:'none',color:'#1a1916',fontSize:13,fontFamily:'Outfit,sans-serif',width:'100%'}} placeholder="Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        {['tous','superadmin','admin','employe','lecteur'].map(r=>(
          <button key={r} onClick={()=>setRoleFilter(r)}
            style={{...btnSm,border:'1px solid rgba(0,0,0,0.14)',background:roleFilter===r?'#2563EB':'#fff',color:roleFilter===r?'#fff':'#6b6860'}}>
            {r==='tous'?'Tous':roleInfo(r).label}
          </button>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:800}}>
            <thead>
              <tr>{['Utilisateur','Rôle','Contact','Salaire','Embauche','Statut','Actions'].map(h=>(
                <th key={h} style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px',padding:'9px 14px',borderBottom:'1px solid rgba(0,0,0,0.08)',textAlign:'left',whiteSpace:'nowrap',background:'#f0eeea'}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#a8a69e'}}>Chargement...</td></tr>
              ) : filtered.map(u => {
                const info = roleInfo(u.role)
                const canEdit = isSuperAdmin || (isAdmin && u.role !== 'superadmin' && u.role !== 'admin')
                const canDelete = isSuperAdmin && u.role !== 'superadmin'
                const canToggle = isSuperAdmin ? u.role !== 'superadmin' : (u.role === 'employe' || u.role === 'lecteur')
                
                return (
                  <tr key={u.id} style={{borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
                    <td style={{padding:'12px 14px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:34,height:34,borderRadius:'50%',background:`${info.color}15`,color:info.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0}}>
                          {u.full_name?.split(' ').map((w:string)=>w[0]).slice(0,2).join('')}
                        </div>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:6}}>
                            {u.full_name}
                            {u.id === currentUser?.id && <span style={{fontSize:9,background:'rgba(37,99,235,0.1)',color:'#2563EB',padding:'2px 6px',borderRadius:4,fontWeight:600}}>VOUS</span>}
                          </div>
                          <div style={{fontSize:11,color:'#a8a69e',marginTop:1}}>@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <span style={{fontSize:11,background:`${info.color}15`,color:info.color,padding:'3px 9px',borderRadius:4,fontWeight:600,border:`1px solid ${info.color}30`,display:'inline-flex',alignItems:'center',gap:5}}>
                        <span>{info.icon}</span>
                        {info.label}
                      </span>
                    </td>
                    <td style={{padding:'12px 14px',fontSize:12}}>
                      {u.email && <div style={{color:'#6b6860'}}>{u.email}</div>}
                      {u.phone && <div style={{color:'#a8a69e',marginTop:2}}>{u.phone}</div>}
                    </td>
                    <td style={{padding:'12px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12}}>{u.salary?dzd(u.salary):'—'}</td>
                    <td style={{padding:'12px 14px',fontSize:12,color:'#6b6860'}}>{u.hiring_date?new Date(u.hiring_date).toLocaleDateString('fr-DZ'):'—'}</td>
                    <td style={{padding:'12px 14px'}}>
                      <span style={{fontSize:11,padding:'3px 9px',borderRadius:4,fontWeight:600,background:u.is_active?'rgba(22,163,74,0.1)':'rgba(220,38,38,0.08)',color:u.is_active?'#15803d':'#dc2626'}}>
                        {u.is_active?'● Actif':'○ Inactif'}
                      </span>
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <div style={{display:'flex',gap:5}}>
                        {canEdit && <button style={{...btnSm,background:'transparent',color:'#6b6860',border:'1px solid rgba(0,0,0,0.14)'}} onClick={()=>openEdit(u)}>Modifier</button>}
                        {canToggle && u.id !== currentUser?.id && <button style={{...btnSm,background:u.is_active?'rgba(217,119,6,0.08)':'rgba(22,163,74,0.08)',color:u.is_active?'#d97706':'#16a34a',border:`1px solid ${u.is_active?'rgba(217,119,6,0.15)':'rgba(22,163,74,0.15)'}`}} onClick={()=>toggleActive(u)}>{u.is_active?'Désactiver':'Activer'}</button>}
                        {canDelete && <button style={{...btnSm,background:'rgba(220,38,38,0.08)',color:'#dc2626',border:'1px solid rgba(220,38,38,0.15)'}} onClick={()=>deleteUser(u)}>Supprimer</button>}
                        {u.role === 'superadmin' && <span style={{fontSize:10,color:'#a8a69e',fontStyle:'italic'}}>🔒 Protégé</span>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}