import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase, installStorage } from './supabaseClient'
import App from './App.jsx'

const wrap = { minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0e17', fontFamily: "'IBM Plex Sans', system-ui, sans-serif", padding: 20 }
const card = { width: '100%', maxWidth: 360, background: '#131829', border: '1px solid #262c46', borderRadius: 16, padding: 24 }
const inp = { width: '100%', boxSizing: 'border-box', marginTop: 6, marginBottom: 14, background: '#0f1424', border: '1px solid #262c46', color: '#e7ecff', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none' }
const btn = { width: '100%', background: '#4FD1C5', color: '#08221f', border: 'none', borderRadius: 8, padding: '11px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }

function Root() {
  const [sessao, setSessao] = useState(null)
  const [pronto, setPronto] = useState(false)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSessao(data.session); setPronto(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const entrar = async (e) => {
    e.preventDefault()
    setErro(''); setCarregando(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
      setCarregando(false)
      if (error) { console.error('login error', error); setErro(`${error.name||'Erro'}: ${error.message||'sem mensagem'} [${error.status||'?'}]`) }
    } catch (ex) {
      setCarregando(false)
      console.error('login exception', ex)
      setErro('Exceção: ' + (ex && ex.message ? ex.message : String(ex)))
    }
  }

  if (!pronto) return <div style={wrap}><span style={{ color: '#8a93b2' }}>Carregando…</span></div>

  if (sessao) {
    installStorage()
    return <App />
  }

  return (
    <div style={wrap}>
      <form style={card} onSubmit={entrar}>
        <h1 style={{ color: '#e7ecff', fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, margin: '0 0 4px' }}>Desmistura</h1>
        <p style={{ color: '#8a93b2', fontSize: 13, margin: '0 0 20px' }}>Entre pra ver suas contas.</p>
        <label style={{ color: '#8a93b2', fontSize: 12 }}>Email</label>
        <input style={inp} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="casalmd@desmistura.app" autoCapitalize="none" />
        <label style={{ color: '#8a93b2', fontSize: 12 }}>Senha</label>
        <input style={inp} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        {erro && <p style={{ color: '#ff6b6b', fontSize: 12.5, margin: '0 0 12px' }}>{erro}</p>}
        <button style={btn} disabled={carregando}>{carregando ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<Root />)
