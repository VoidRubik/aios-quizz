import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  auto_release: z.boolean().optional(),
  coach_name: z.string().optional(),
})

export async function POST(req: Request) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const supabase = createServiceClient()

  if (parsed.data.auto_release !== undefined) {
    await supabase.from('settings').update({ auto_release: parsed.data.auto_release }).eq('id', 1)
  }

  if (parsed.data.coach_name !== undefined) {
    await supabase.from('coach').update({ name: parsed.data.coach_name }).limit(1)
  }

  return NextResponse.json({ ok: true })
}
