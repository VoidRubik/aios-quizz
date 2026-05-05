import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  internalNotes: z.string().optional(),
})

export async function POST(req: Request) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const token = randomBytes(24).toString('base64url')
  const supabase = createServiceClient()

  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      name: parsed.data.name,
      email: parsed.data.email ?? null,
      token,
      internal_notes: parsed.data.internalNotes ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('submissions').insert({ client_id: client.id, status: 'not_started' })

  return NextResponse.json({ client, token })
}
