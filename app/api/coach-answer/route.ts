import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  submissionId: z.string().uuid(),
  traitId: z.string().uuid(),
  stage: z.enum(['ninez','adolescencia','juventud','vejez']),
  value: z.enum(['si','no']).nullable(),
})

export async function POST(req: Request) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const { submissionId, traitId, stage, value } = parsed.data
  const supabase = createServiceClient()

  const { data: existing } = await supabase
    .from('answers')
    .select('original_value')
    .eq('submission_id', submissionId)
    .eq('trait_id', traitId)
    .eq('stage', stage)
    .maybeSingle()

  await supabase.from('answers').upsert({
    submission_id: submissionId,
    trait_id: traitId,
    stage,
    value,
    original_value: existing?.original_value ?? null,
    is_coach_edit: true,
  }, { onConflict: 'submission_id,trait_id,stage' })

  return NextResponse.json({ ok: true })
}
