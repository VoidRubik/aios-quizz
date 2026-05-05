import type { Answer, Stage } from '@/lib/heptagrama/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const STAGES: { key: Stage; label: string }[] = [
  { key: 'ninez', label: 'Niñez' },
  { key: 'adolescencia', label: 'Adolescencia' },
  { key: 'juventud', label: 'Juventud' },
  { key: 'vejez', label: 'Vejez' },
]

interface Props {
  typeName: string
  traits: { id: string; text: string }[]
  answers: Record<string, Record<Stage, Answer>>
  coachEdits: Set<string>
  onAnswerChange: (traitId: string, stage: Stage, value: Answer) => void
  onReset: (traitId: string, stage: Stage) => void
}

export function AnswerGrid({ typeName, traits, answers, coachEdits, onAnswerChange, onReset }: Props) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-lg">{typeName}</h3>
      {traits.map(trait => (
        <div key={trait.id} className="grid grid-cols-[1fr_repeat(4,90px)] gap-2 items-center py-1 border-b text-sm">
          <span>{trait.text}</span>
          {STAGES.map(({ key, label }) => {
            const val = answers[trait.id]?.[key] ?? null
            const isEdited = coachEdits.has(`${trait.id}:${key}`)
            return (
              <div key={key} className="flex flex-col items-center gap-0.5">
                <span className="text-xs text-muted-foreground">{label}</span>
                <div className="flex gap-1 items-center">
                  <Button
                    size="sm" variant={val === 'si' ? 'default' : 'outline'}
                    className="h-6 px-2 text-xs"
                    onClick={() => onAnswerChange(trait.id, key, val === 'si' ? null : 'si')}
                  >Sí</Button>
                  <Button
                    size="sm" variant={val === 'no' ? 'destructive' : 'outline'}
                    className="h-6 px-2 text-xs"
                    onClick={() => onAnswerChange(trait.id, key, val === 'no' ? null : 'no')}
                  >No</Button>
                  {isEdited && (
                    <button onClick={() => onReset(trait.id, key)} title="Restaurar original" className="text-xs text-yellow-600 ml-1">↺</button>
                  )}
                </div>
                {isEdited && <Badge variant="outline" className="text-[10px] h-4">editado</Badge>}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
