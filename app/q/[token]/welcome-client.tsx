'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  token: string
  clientName: string
  initialEmail: string | null
}

export function WelcomeClient({ token, clientName, initialEmail }: Props) {
  const [email, setEmail] = useState(initialEmail ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email }),
    })
    if (!res.ok) {
      setError('Error al guardar. Intenta de nuevo.')
      setLoading(false)
      return
    }
    window.location.href = `/q/${token}`
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-card">
        <div className="welcome-header">
          <span className="welcome-logo">Heptagrama</span>
        </div>
        <h1 className="welcome-title">Bienvenido/a, {clientName}</h1>
        <p className="welcome-subtitle">
          A continuación responderás un cuestionario sobre diferentes etapas de tu vida.
          Responde con sinceridad — no hay respuestas correctas o incorrectas.
        </p>
        <form onSubmit={handleStart} className="welcome-form">
          <label className="welcome-label" htmlFor="email">
            Correo electrónico
            <span className="welcome-label-hint">Recibirás tu Cartilla Fundamental aquí</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            className="welcome-input"
          />
          {error && <p className="welcome-error">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email}
            className="welcome-button"
          >
            {loading ? 'Comenzando…' : 'Comenzar cuestionario'}
          </button>
        </form>
      </div>
    </div>
  )
}
