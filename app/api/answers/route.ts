import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  token: z.string(),
  traitId: z.string().uuid(),
  stage: z.enum(['ninez','adolescencia','juventud','vejez']),
  value: z.enum(['si','no']).nullable(),
})

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const { token, traitId, stage, value } = parsed.data
  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, submissions(id, status)')
    .eq('token', token)
    .single()

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let submission = (client.submissions as any[])?.[0]
  if (submission?.status === 'submitted' || submission?.status === 'released') {
    return NextResponse.json({ error: 'Locked' }, { status: 403 })
  }

  if (!submission) {
    const { data } = await supabase
      .from('submissions')
      .insert({ client_id: client.id, status: 'in_progress' })
      .select()
      .single()
    submission = data
  } else if (submission.status === 'not_started') {
    await supabase.from('submissions').update({ status: 'in_progress' }).eq('id', submission.id)
  }

  // Preserve original_value on first write
  const { data: existing } = await supabase
    .from('answers')
    .select('original_value')
    .eq('submission_id', submission.id)
    .eq('trait_id', traitId)
    .eq('stage', stage)
    .maybeSingle()

  await supabase.from('answers').upsert({
    submission_id: submission.id,
    trait_id: traitId,
    stage,
    value,
    original_value: existing?.original_value ?? value,
    is_coach_edit: false,
  }, { onConflict: 'submission_id,trait_id,stage' })

  return NextResponse.json({ ok: true })
}
