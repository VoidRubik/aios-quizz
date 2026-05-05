'use client'
import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { TypeStep } from './type-step'
import type { Answer, Stage } from '@/lib/heptagrama/types'

interface Trait { id: string; text: string; typeSlug: string }
interface PersonalityTypeInfo { slug: string; name: string; traits: Trait[] }

interface Props {
  token: string
  types: PersonalityTypeInfo[]
  initialAnswers: Record<string, Record<string, string>>
  onSubmitted: () => void
}

const STAGES: Stage[] = ['ninez', 'adolescencia', 'juventud', 'vejez']

export function Wizard({ token, types, initialAnswers, onSubmitted }: Props) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Record<Stage, Answer>>>(() => {
    const map: Record<string, Record<Stage, Answer>> = {}
    for (const [traitId, stageMap] of Object.entries(initialAnswers)) {
      map[traitId] = { ninez: null, adolescencia: null, juventud: null, vejez: null, ...stageMap } as Record<Stage, Answer>
    }
    return map
  })
  const [submitting, setSubmitting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveAnswer = useCallback(async (traitId: string, stage: Stage, value: Answer) => {
    await fetch('/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, traitId, stage, value }),
    })
  }, [token])

  const handleChange = useCallback((traitId: string, stage: Stage, value: Answer) => {
    setAnswers(prev => ({
      ...prev,
      [traitId]: { ...(prev[traitId] ?? { ninez: null, adolescencia: null, juventud: null, vejez: null }), [stage]: value }
    }))
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => saveAnswer(traitId, stage, value), 500)
  }, [saveAnswer])

  const allJuventudAnswered = types.every(t =>
    t.traits.every(trait => {
      const a = answers[trait.id]
      return a?.juventud !== null && a?.juventud !== undefined
    })
  )

  const currentType = types[step]
  const isLastStep = step === types.length - 1

  const handleSubmit = async () => {
    setSubmitting(true)
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    if (res.ok) onSubmitted()
    else setSubmitting(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Paso {step + 1} de {types.length}</span>
        <span>{currentType.name}</span>
      </div>

      <TypeStep
        typeName={currentType.name}
        traits={currentType.traits}
        answers={answers}
        onChange={handleChange}
      />

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
          Anterior
        </Button>
        {isLastStep ? (
          <Button onClick={handleSubmit} disabled={!allJuventudAnswered || submitting}>
            {submitting ? 'Enviando...' : 'Enviar cuestionario'}
          </Button>
        ) : (
          <Button onClick={() => setStep(s => s + 1)}>Siguiente</Button>
        )}
      </div>

      {isLastStep && !allJuventudAnswered && (
        <p className="text-sm text-destructive text-center">
          Completa todas las respuestas de Juventud antes de enviar.
        </p>
      )}
    </div>
  )
}
