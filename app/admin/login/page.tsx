'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/admin')
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-card">
        <div className="welcome-header">
          <span className="welcome-logo">Heptagrama</span>
        </div>
        <h1 className="welcome-title">Acceso coach</h1>
        <form onSubmit={handleLogin} className="welcome-form">
          <label className="welcome-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="welcome-input"
          />
          <label className="welcome-label" htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="welcome-input"
          />
          {error && <p className="welcome-error">{error}</p>}
          <button type="submit" disabled={loading} className="welcome-button">
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
