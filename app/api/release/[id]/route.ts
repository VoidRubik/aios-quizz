import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { ResultsNote } from '@/lib/pdf/results-note'
import { computeResult } from '@/lib/heptagrama/calc'
import type { AnswersMap, Stage, TypeSlug } from '@/lib/heptagrama/types'
import { sendCartillaEmail } from '@/lib/email/send-cartilla'
import React from 'react'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('submissions')
    .update({ status: 'released', released_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send cartilla email after release
  try {
    const { data: submission } = await supabase
      .from('submissions')
      .select('id, cartilla_override, client:clients(id, name, email)')
      .eq('id', id)
      .single()

    const client = submission?.client as { id: string; name: string; email: string | null } | null

    if (client?.email) {
      const { data: answerRows } = await supabase
        .from('answers')
        .select('trait_id, stage, value')
        .eq('submission_id', id)

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
      const cartilla = (submission?.cartilla_override as Record<string, string>) ?? {}

      const pdfBuffer = await renderToBuffer(
        React.createElement(ResultsNote, {
          clientName: client.name,
          date: new Date().toLocaleDateString('es'),
          coachName: coach?.name ?? '',
          logoUrl: coach?.logo_url ?? undefined,
          result,
          cartilla,
          coachNote: '',
        }) as any
      )

      await sendCartillaEmail({
        toEmail: client.email,
        toName: client.name,
        pdfBuffer: Buffer.from(pdfBuffer),
      })
    }
  } catch (err) {
    console.error('Email send failed:', err)
  }

  return NextResponse.json({ ok: true })
}
