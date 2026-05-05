'use client'
import { useState, useCallback, useRef, useMemo } from 'react'
import { computeResult } from '@/lib/heptagrama/calc'
import type { AnswersMap, Stage, TypeSlug } from '@/lib/heptagrama/types'
import { AnswerGrid } from '@/components/admin/answer-grid'
import { ResultsSidebar } from '@/components/admin/results-sidebar'
import { CartillaEditor } from '@/components/admin/cartilla-editor'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface Props {
  client: any
  submission: any
  types: any[]
  answerRows: any[]
}

export function ReviewClient({ client, submission, types, answerRows }: Props) {
  const traitIdsByType = useMemo(() => {
    const map: Record<TypeSlug, string[]> = {} as any
    for (const t of types) map[t.slug as TypeSlug] = t.traits.map((tr: any) => tr.id)
    return map
  }, [types])

  const [answers, setAnswers] = useState<AnswersMap>(() => {
    const map: AnswersMap = {}
    for (const row of answerRows) {
      if (!map[row.trait_id]) map[row.trait_id] = { ninez: null, adolescencia: null, juventud: null, vejez: null }
      map[row.trait_id][row.stage as Stage] = row.value ?? null
    }
    return map
  })

  const [coachEdits, setCoachEdits] = useState<Set<string>>(() =>
    new Set(answerRows.filter((r: any) => r.is_coach_edit).map((r: any) => `${r.trait_id}:${r.stage}`))
  )
  const [originals] = useState<Record<string, string | null>>(() => {
    const map: Record<string, string | null> = {}
    for (const row of answerRows) map[`${row.trait_id}:${row.stage}`] = row.original_value ?? null
    return map
  })

  const [coachNote, setCoachNote] = useState(submission?.coach_note ?? '')
  const [cartilla, setCartilla] = useState<Record<string, string>>(submission?.cartilla_override ?? {})
  const [saving, setSaving] = useState(false)
  const [released, setReleased] = useState(submission?.status === 'released')
  const noteDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const result = useMemo(() => computeResult(answers, traitIdsByType), [answers, traitIdsByType])

  const handleAnswerChange = useCallback(async (traitId: string, stage: Stage, value: import('@/lib/heptagrama/types').Answer) => {
    setAnswers(prev => ({
      ...prev,
      [traitId]: { ...(prev[traitId] ?? { ninez: null, adolescencia: null, juventud: null, vejez: null }), [stage]: value }
    }))
    setCoachEdits(prev => { const s = new Set(prev); s.add(`${traitId}:${stage}`); return s })

    if (submission) {
      await fetch('/api/coach-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id, traitId, stage, value }),
      })
    }
  }, [submission])

  const handleReset = useCallback(async (traitId: string, stage: Stage) => {
    const key = `${traitId}:${stage}`
    const orig = originals[key] as import('@/lib/heptagrama/types').Answer
    setAnswers(prev => ({
      ...prev,
      [traitId]: { ...(prev[traitId] ?? { ninez: null, adolescencia: null, juventud: null, vejez: null }), [stage]: orig }
    }))
    setCoachEdits(prev => { const s = new Set(prev); s.delete(key); return s })
    if (submission) {
      await fetch('/api/coach-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id, traitId, stage, value: orig }),
      })
    }
  }, [originals, submission])

  const handleNoteChange = (note: string) => {
    setCoachNote(note)
    if (noteDebounce.current) clearTimeout(noteDebounce.current)
    noteDebounce.current = setTimeout(() => {
      if (submission) fetch('/api/coach-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id, note }),
      })
    }, 800)
  }

  const handleCartillaChange = async (updated: Record<string, string>) => {
    setCartilla(updated)
    if (submission) {
      await fetch('/api/cartilla', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id, cartilla: updated }),
      })
    }
  }

  const handleRelease = async () => {
    if (!submission) return
    setSaving(true)
    const res = await fetch(`/api/release/${submission.id}`, { method: 'POST' })
    if (res.ok) setReleased(true)
    setSaving(false)
  }

  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-3 flex items-center gap-4">
        <Link href="/admin" className="text-sm text-muted-foreground hover:underline">← Panel</Link>
        <h1 className="font-semibold">{client.name}</h1>
        {client.email && <span className="text-sm text-muted-foreground">{client.email}</span>}
        {released && <Badge>Publicado</Badge>}
      </header>

      <div className="flex">
        <div className="flex-1 p-6 space-y-8 overflow-y-auto">
          {types.map((type: any) => (
            <AnswerGrid
              key={type.id}
              typeName={type.name}
              traits={type.traits}
              answers={answers}
              coachEdits={coachEdits}
              onAnswerChange={handleAnswerChange}
              onReset={handleReset}
            />
          ))}

          <div className="space-y-2">
            <h3 className="font-medium">Nota personal del coach</h3>
            <Textarea
              value={coachNote}
              onChange={e => handleNoteChange(e.target.value)}
              rows={6}
              placeholder="Escribe tu nota personal para el cliente..."
            />
          </div>

          <CartillaEditor cartilla={cartilla} onChange={handleCartillaChange} />

          {!released && submission?.status !== 'not_started' && (
            <div className="border-t pt-4">
              <Button onClick={handleRelease} disabled={saving}>
                {saving ? 'Publicando...' : 'Publicar resultados al cliente'}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                El cliente podrá descargar su PDF una vez publicado.
              </p>
            </div>
          )}
        </div>

        <div className="w-80 border-l sticky top-0 h-screen overflow-y-auto p-4">
          <ResultsSidebar result={result} />
        </div>
      </div>
    </div>
  )
}
