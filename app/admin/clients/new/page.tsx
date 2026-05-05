'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewClientPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [generatedLink, setGeneratedLink] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email: email || undefined, internalNotes: notes || undefined }),
    })
    const data = await res.json()
    if (data.token) {
      setGeneratedLink(`${window.location.origin}/q/${data.token}`)
    }
    setLoading(false)
  }

  if (generatedLink) {
    return (
      <div className="max-w-lg mx-auto p-8 space-y-4">
        <h1 className="text-xl font-semibold">Cliente creado</h1>
        <p className="text-sm text-muted-foreground">Copia este enlace y envíalo al cliente:</p>
        <div className="flex gap-2">
          <Input value={generatedLink} readOnly className="font-mono text-sm" />
          <Button onClick={() => navigator.clipboard.writeText(generatedLink)}>Copiar</Button>
        </div>
        <Button variant="outline" onClick={() => window.location.href = '/admin'}>Volver al panel</Button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-8">
      <Card>
        <CardHeader><CardTitle>Nuevo cliente</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Email (opcional)</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Notas internas (no visibles al cliente)</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear y generar enlace'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
