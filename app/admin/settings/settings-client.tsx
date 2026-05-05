'use client'
import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function SettingsClient({ settings, coach }: { settings: any; coach: any }) {
  const [autoRelease, setAutoRelease] = useState(settings?.auto_release ?? false)
  const [coachName, setCoachName] = useState(coach?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auto_release: autoRelease, coach_name: coachName }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-lg mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold">Ajustes</h1>

      <Card>
        <CardHeader><CardTitle>Publicación automática</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-3">
            <Switch checked={autoRelease} onCheckedChange={setAutoRelease} />
            <Label>Publicar resultados automáticamente al recibir el cuestionario</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Por defecto OFF — el coach revisa manualmente cada envío antes de publicar.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Información del coach</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Nombre del coach</Label>
            <Input value={coachName} onChange={e => setCoachName(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar cambios'}
      </Button>
    </div>
  )
}
