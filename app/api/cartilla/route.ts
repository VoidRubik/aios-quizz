import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  submissionId: z.string().uuid(),
  cartilla: z.record(z.string(), z.string()),
})

export async function POST(req: Request) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const supabase = createServiceClient()
  await supabase.from('submissions')
    .update({ cartilla_override: parsed.data.cartilla })
    .eq('id', parsed.data.submissionId)
  return NextResponse.json({ ok: true })
}
