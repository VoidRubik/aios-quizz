'use client'
import { Button } from '@/components/ui/button'
import type { Answer, Stage } from '@/lib/heptagrama/types'

const STAGES: { key: Stage; label: string }[] = [
  { key: 'ninez', label: 'Niñez' },
  { key: 'adolescencia', label: 'Adolescencia' },
  { key: 'juventud', label: 'Juventud' },
  { key: 'vejez', label: 'Vejez' },
]

interface Props {
  traitId: string
  text: string
  answers: Record<Stage, Answer>
  onChange: (traitId: string, stage: Stage, value: Answer) => void
}

export function TraitRow({ traitId, text, answers, onChange }: Props) {
  return (
    <div className="grid grid-cols-[1fr_repeat(4,_80px)] gap-2 items-start py-2 border-b last:border-0">
      <p className="text-sm">{text}</p>
      {STAGES.map(({ key, label }) => {
        const val = answers[key]
        return (
          <div key={key} className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <div className="flex gap-1">
              <Button
                size="sm" variant={val === 'si' ? 'default' : 'outline'}
                className="h-7 px-2 text-xs"
                onClick={() => onChange(traitId, key, val === 'si' ? null : 'si')}
              >Sí</Button>
              <Button
                size="sm" variant={val === 'no' ? 'destructive' : 'outline'}
                className="h-7 px-2 text-xs"
                onClick={() => onChange(traitId, key, val === 'no' ? null : 'no')}
              >No</Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
