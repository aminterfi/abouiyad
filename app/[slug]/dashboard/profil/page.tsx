'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function dzd(v: number) { return (v||0).toLocaleString('fr-DZ')+' DZD' }

const inp: React.CSSProperties = { width:'100%', background:'#f0eeea', border:'1px solid rgba(0,0,0,0.14)', borderRadius:6, padding:'9px 12px', fontSize:13, color:'#1a1916', fontFamily:'Outfit,sans-serif', outline:'none' }
const lbl: React.CSSProperties = { display:'block', fontSize:12, fontWeight:500, color:'#6b6860', marginBottom:5 }
const btnP: React.CSSProperties = { background:'#2563EB', color:'#fff', border:'none', borderRadius:6, padding:'9px 18px', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'Outfit,sans-serif', display:'inline-flex', alignItems:'center', gap:6 }

export default function ProfilPage() {
  const [user, setUser] = useState<any>(null)
  const [form, setForm] = useState({ full_name:'', email:'', phone:'' })
  const [password, setPassword] = useState({ old:'', new1:'', new2:'' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [stats, setStats] = useState({ bills:0, payments:0, clients:0 })

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) {
      const parsed = JSON.parse(u)
      setUser(parsed)
      setForm({ full_name:parsed.full_name||'', email:parsed.email||'', phone:parsed.phone||'' })
      fetchStats(parsed.id)
    }
  }, [])

  async function fetchStats(uid: string) {
    const u = JSON.parse(localStorage.getItem('user')||'{}')
    if (!u.company_id) return
    const [{ count: bills }, { count: payments }, { count: clients }] = await Promise.all([
      supabase.from('bills').select('*',{count:'exact',head:true}).eq('created_by',uid).eq('company_id',u.company_id),
      supabase.from('payments').select('*',{count:'exact',head:true}).eq('created_by',uid).eq('company_id',u.company_id),
      supabase.from('clients').select('*',{count:'exact',head:true}).eq('created_by',uid).eq('company_id',u.company_id),
    ])
    setStats({ bills:bills||0, payments:payments||0, clients:clients||0 })
  }

  async function save() {
    setSaving(true)
    await supabase.from('users').update(form).eq('id', user.id)
    const updated = { ...user, ...form }
    localStorage.setItem('user', JSON.stringify(updated))
    setUser(updated)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (!user) return null

  const roleColors: Record<string,string> = {
    superadmin:'#7c3aed', admin:'#2563EB', employe:'#0d9488', lecteur:'#6b6860'
  }

  return (
    <div style={{maxWidth:820}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18}}>
        <div>
          <div style={{fontSize:17,fontWeight:600,letterSpacing:'-.3px'}}>Mon profil</div>
          <div style={{fontSize:12,color:'#a8a69e',marginTop:2}}>Gérez vos informations personnelles</div>
        </div>
        <button style={btnP} onClick={save} disabled={saving}>
          {saved ? '✓ Enregistré !' : saving ? '...' : 'Enregistrer'}
        </button>
      </div>

      {/* PROFILE HEADER */}
      <div style={{background:'linear-gradient(135deg,rgba(37,99,235,0.08),rgba(124,58,237,0.05))',border:'1px solid rgba(37,99,235,0.12)',borderRadius:12,padding:24,marginBottom:16,display:'flex',alignItems:'center',gap:20}}>
        <div style={{width:80,height:80,borderRadius:'50%',background:`linear-gradient(135deg,#2563EB,${roleColors[user.role]||'#7c3aed'})`,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:700,flexShrink:0}}>
          {user.full_name?.split(' ').map((w:string)=>w[0]).slice(0,2).join('')}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:22,fontWeight:700,color:'#1a1916',letterSpacing:'-.5px'}}>{user.full_name}</div>
          <div style={{fontSize:13,color:'#6b6860',marginTop:4}}>@{user.username} · {user.email}</div>
          <div style={{marginTop:8,display:'flex',gap:8,flexWrap:'wrap'}}>
            <span style={{fontSize:11,background:`${roleColors[user.role]}15`,color:roleColors[user.role],padding:'3px 10px',borderRadius:20,fontWeight:600,border:`1px solid ${roleColors[user.role]}30`}}>{user.role}</span>
            <span style={{fontSize:11,background:'rgba(22,163,74,0.1)',color:'#15803d',padding:'3px 10px',borderRadius:20,fontWeight:600}}>● Actif</span>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
        {[
          { label:'Factures créées', val:stats.bills, color:'#2563EB' },
          { label:'Paiements enregistrés', val:stats.payments, color:'#16a34a' },
          { label:'Clients ajoutés', val:stats.clients, color:'#7c3aed' },
        ].map((s,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:'16px 20px'}}>
            <div style={{fontSize:11,fontWeight:600,color:'#a8a69e',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:22,fontWeight:700,color:s.color}}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* INFO PERSO */}
      <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:24,marginBottom:16}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:16}}>Informations personnelles</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <div><label style={lbl}>Nom complet</label><input style={inp} value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></div>
          <div><label style={lbl}>Nom d'utilisateur</label><input style={{...inp,background:'#e8e6e0',color:'#a8a69e',cursor:'not-allowed'}} value={user.username} disabled/></div>
          <div><label style={lbl}>Email</label><input type="email" style={inp} value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
          <div><label style={lbl}>Téléphone</label><input style={inp} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
        </div>
      </div>

      {/* EMPLOI */}
      <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:24,marginBottom:16}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:16}}>Informations emploi</div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {[
            { label:'Salaire', val:user.salary?dzd(user.salary):'—' },
            { label:'Date d\'embauche', val:user.hiring_date?new Date(user.hiring_date).toLocaleDateString('fr-DZ',{dateStyle:'full'}):'—' },
            { label:'Prochaine paie', val:user.next_salary_date?new Date(user.next_salary_date).toLocaleDateString('fr-DZ'):'—' },
            { label:'Compte créé', val:new Date(user.created_at).toLocaleDateString('fr-DZ',{dateStyle:'full'}) },
          ].map((f,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',background:'#f8f7f5',borderRadius:6,fontSize:13}}>
              <span style={{color:'#6b6860'}}>{f.label}</span>
              <span style={{fontWeight:600,fontFamily:'JetBrains Mono,monospace',fontSize:12}}>{f.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* PASSWORD */}
      <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.07)',borderRadius:10,padding:24,marginBottom:16}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>Changer de mot de passe</div>
        <div style={{fontSize:12,color:'#a8a69e',marginBottom:16}}>Sécurisez votre compte en utilisant un mot de passe fort</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <div style={{gridColumn:'1/-1'}}><label style={lbl}>Mot de passe actuel</label><input type="password" style={inp} placeholder="••••••••" value={password.old} onChange={e=>setPassword({...password,old:e.target.value})}/></div>
          <div><label style={lbl}>Nouveau mot de passe</label><input type="password" style={inp} placeholder="••••••••" value={password.new1} onChange={e=>setPassword({...password,new1:e.target.value})}/></div>
          <div><label style={lbl}>Confirmer</label><input type="password" style={inp} placeholder="••••••••" value={password.new2} onChange={e=>setPassword({...password,new2:e.target.value})}/></div>
        </div>
        <button style={{...btnP,marginTop:14}} onClick={()=>alert('Fonctionnalité disponible bientôt')}>Changer le mot de passe</button>
      </div>
    </div>
  )
}