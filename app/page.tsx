'use client'
import { useState } from 'react'

export default function Home() {
  const [slug, setSlug] = useState('')

  function go() {
    if (!slug) return
    window.location.href = `/${slug}`
  }

  return (
    <div style={{
      minHeight:'100vh',
      display:'flex',
      alignItems:'center',
      justifyContent:'center',
      background:'#f8f7f5'
    }}>
      <div style={{
        background:'#fff',
        padding:30,
        borderRadius:12,
        boxShadow:'0 10px 30px rgba(0,0,0,0.08)',
        textAlign:'center'
      }}>
        <h2 style={{marginBottom:10}}>Accéder à votre entreprise</h2>

        <input
          placeholder="nom-entreprise"
          value={slug}
          onChange={e=>setSlug(e.target.value)}
          style={{
            padding:12,
            width:220,
            border:'1px solid #ddd',
            borderRadius:6,
            marginBottom:10
          }}
        />

        <br/>

        <button onClick={go}
          style={{
            padding:'10px 20px',
            background:'#2563EB',
            color:'#fff',
            border:'none',
            borderRadius:6,
            cursor:'pointer'
          }}>
          Accéder
        </button>
      </div>
    </div>
  )
}