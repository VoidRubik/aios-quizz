'use client'
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
    <div className="trait-card">
      <p className="trait-text">{text}</p>
      <div className="trait-stages">
        {STAGES.map(({ key, label }) => {
          const val = answers[key]
          return (
            <div key={key} className="trait-stage">
              <span className="trait-stage-label">{label}</span>
              <div className="trait-pills">
                <button
                  type="button"
                  className={`trait-pill ${val === 'si' ? 'trait-pill--si-active' : ''}`}
                  onClick={() => onChange(traitId, key, val === 'si' ? null : 'si')}
                >Sí</button>
                <button
                  type="button"
                  className={`trait-pill ${val === 'no' ? 'trait-pill--no-active' : ''}`}
                  onClick={() => onChange(traitId, key, val === 'no' ? null : 'no')}
                >No</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
