import { TraitRow } from './trait-row'
import type { Answer, Stage } from '@/lib/heptagrama/types'

interface Trait { id: string; text: string }

interface Props {
  typeName: string
  traits: Trait[]
  answers: Record<string, Record<Stage, Answer>>
  onChange: (traitId: string, stage: Stage, value: Answer) => void
}

export function TypeStep({ typeName, traits, answers, onChange }: Props) {
  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold mb-4">{typeName}</h2>
      {traits.map(trait => (
        <TraitRow
          key={trait.id}
          traitId={trait.id}
          text={trait.text}
          answers={(answers[trait.id] ?? { ninez: null, adolescencia: null, juventud: null, vejez: null }) as Record<Stage, Answer>}
          onChange={onChange}
        />
      ))}
    </div>
  )
}
