import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { ResultsNote } from '@/lib/pdf/results-note'
import { computeResult } from '@/lib/heptagrama/calc'
import type { AnswersMap, Stage, TypeSlug } from '@/lib/heptagrama/types'
import React from 'react'

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('name, submissions(id, status, coach_note, cartilla_override)')
    .eq('token', token)
    .single()

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const submission = Array.isArray(client.submissions)
    ? client.submissions[0]
    : client.submissions
  if (!submission || submission.status !== 'released') {
    return NextResponse.json({ error: 'Not released' }, { status: 403 })
  }

  const { data: answerRows } = await supabase
    .from('answers')
    .select('trait_id, stage, value')
    .eq('submission_id', submission.id)

  const { data: typeRows } = await supabase
    .from('personality_types')
    .select('id, slug, traits(id)')

  const traitIdsByType: Record<TypeSlug, string[]> = {} as any
  for (const t of typeRows ?? []) {
    traitIdsByType[t.slug as TypeSlug] = (t.traits as any[]).map(tr => tr.id)
  }

  const answers: AnswersMap = {}
  for (const row of answerRows ?? []) {
    if (!answers[row.trait_id]) answers[row.trait_id] = { ninez: null, adolescencia: null, juventud: null, vejez: null }
    answers[row.trait_id][row.stage as Stage] = row.value ?? null
  }

  const result = computeResult(answers, traitIdsByType)
  const { data: coach } = await supabase.from('coach').select('name, logo_url').single()

  const pdfBuffer = await renderToBuffer(
    React.createElement(ResultsNote, {
      clientName: client.name,
      date: new Date().toLocaleDateString('es'),
      coachName: coach?.name ?? '',
      logoUrl: coach?.logo_url ?? undefined,
      result,
      cartilla: submission.cartilla_override ?? {},
      coachNote: submission.coach_note ?? '',
    }) as any
  )

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="resultados-${(client.name as string).replace(/\s+/g, '-')}.pdf"`,
    },
  })
}
