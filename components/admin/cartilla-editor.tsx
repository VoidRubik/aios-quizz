'use client'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const CARTILLA_FIELDS: { key: string; label: string; multiline?: boolean }[] = [
  { key: 'polaridad', label: 'Polaridad' },
  { key: 'glandulaMaestra', label: 'Glándula maestra' },
  { key: 'glandulaSubsidiaria', label: 'Glándula subsidiaria' },
  { key: 'enfasisGenetico', label: 'Énfasis genético' },
  { key: 'dictum', label: 'Dictum de autoafirmación' },
  { key: 'anhelo', label: 'Anhelo de plenitud' },
  { key: 'pecadoCapital', label: 'Pecado capital' },
  { key: 'virtud', label: 'Virtud' },
  { key: 'susceptibilidad', label: 'Susceptibilidad' },
  { key: 'rasgoDominante', label: 'Rasgo dominante' },
  { key: 'trabajoARealizar', label: 'Trabajo a realizar', multiline: true },
]

interface Props {
  cartilla: Record<string, string>
  onChange: (updated: Record<string, string>) => void
}

export function CartillaEditor({ cartilla, onChange }: Props) {
  const update = (key: string, value: string) => onChange({ ...cartilla, [key]: value })

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Cartilla Fundamental</h3>
      {CARTILLA_FIELDS.map(({ key, label, multiline }) => (
        <div key={key} className="space-y-1">
          <Label>{label}</Label>
          {multiline ? (
            <Textarea value={cartilla[key] ?? ''} onChange={e => update(key, e.target.value)} rows={3} />
          ) : (
            <Input value={cartilla[key] ?? ''} onChange={e => update(key, e.target.value)} />
          )}
        </div>
      ))}
    </div>
  )
}
