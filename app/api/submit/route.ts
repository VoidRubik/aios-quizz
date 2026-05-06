import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { renderToBuffer } from '@react-pdf/renderer'
import { ResultsNote } from '@/lib/pdf/results-note'
import { computeResult } from '@/lib/heptagrama/calc'
import type { AnswersMap, Stage, TypeSlug } from '@/lib/heptagrama/types'
import { sendCartillaEmail } from '@/lib/email/send-cartilla'
import React from 'react'

const schema = z.object({ token: z.string() })

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const { token } = parsed.data
  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, email, submissions(id, status)')
    .eq('token', token)
    .single()

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const submission = (client.submissions as any[])?.[0]
  if (!submission || submission.status !== 'in_progress') {
    return NextResponse.json({ error: 'Not in progress' }, { status: 400 })
  }

  const { data: traits } = await supabase.from('traits').select('id')
  const { data: juventudAnswers } = await supabase
    .from('answers')
    .select('trait_id, value')
    .eq('submission_id', submission.id)
    .eq('stage', 'juventud')

  const answeredTraitIds = new Set(
    (juventudAnswers ?? []).filter(a => a.value !== null).map(a => a.trait_id)
  )
  const allTraitIds = (traits ?? []).map((t: any) => t.id)
  const allJuventudAnswered = allTraitIds.every((id: string) => answeredTraitIds.has(id))

  if (!allJuventudAnswered) {
    return NextResponse.json({ error: 'Juventud incomplete' }, { status: 422 })
  }

  const { data: settings } = await supabase.from('settings').select('auto_release').single()
  const newStatus = settings?.auto_release ? 'released' : 'submitted'

  const { data: allAnswers } = await supabase
    .from('answers')
    .select('trait_id, value')
    .eq('submission_id', submission.id)
    .eq('stage', 'juventud')

  const { data: typeRows } = await supabase
    .from('personality_types')
    .select('id, slug, default_cartilla')

  const { data: traitRows } = await supabase.from('traits').select('id, type_id')
  const traitTypeMap: Record<string, number> = {}
  for (const t of traitRows ?? []) traitTypeMap[t.id] = t.type_id
  const typeById: Record<number, any> = {}
  for (const t of typeRows ?? []) typeById[t.id] = t

  const siByType: Record<number, number> = {}
  const totalByType: Record<number, number> = {}
  for (const a of allAnswers ?? []) {
    const typeId = traitTypeMap[a.trait_id]
    if (!typeId) continue
    totalByType[typeId] = (totalByType[typeId] ?? 0) + 1
    if (a.value === 'si') siByType[typeId] = (siByType[typeId] ?? 0) + 1
  }

  let dominantTypeId: number | null = null
  let maxRaw = -1
  for (const [tid, total] of Object.entries(totalByType)) {
    const raw = (siByType[Number(tid)] ?? 0) / total
    if (raw > maxRaw) { maxRaw = raw; dominantTypeId = Number(tid) }
  }

  const cartillaOverride = dominantTypeId ? typeById[dominantTypeId]?.default_cartilla ?? {} : {}

  await supabase.from('submissions').update({
    status: newStatus,
    submitted_at: new Date().toISOString(),
    ...(newStatus === 'released' ? { released_at: new Date().toISOString() } : {}),
    cartilla_override: cartillaOverride,
  }).eq('id', submission.id)

  if (newStatus === 'released' && client.email) {
    try {
      const { data: answerRows } = await supabase
        .from('answers')
        .select('trait_id, stage, value')
        .eq('submission_id', submission.id)

      const { data: typeRowsFull } = await supabase
        .from('personality_types')
        .select('id, slug, traits(id)')

      const traitIdsByType: Record<TypeSlug, string[]> = {} as any
      for (const t of typeRowsFull ?? []) {
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
          cartilla: cartillaOverride,
          coachNote: '',
        }) as any
      )

      await sendCartillaEmail({
        toEmail: client.email,
        toName: client.name,
        pdfBuffer: Buffer.from(pdfBuffer),
      })
    } catch (err) {
      console.error('Email send failed:', err)
    }
  }

  return NextResponse.json({ ok: true, status: newStatus })
}
