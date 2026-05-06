import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  token: z.string(),
  email: z.string().email(),
})

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const { token, email } = parsed.data
  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, submissions(id, status)')
    .eq('token', token)
    .single()

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await supabase.from('clients').update({ email }).eq('id', client.id)

  const existing = (client.submissions as any[])?.[0]

  if (existing && existing.status !== 'not_started') {
    return NextResponse.json({ ok: true })
  }

  if (existing) {
    await supabase.from('submissions')
      .update({ status: 'in_progress' })
      .eq('id', existing.id)
  } else {
    await supabase.from('submissions').insert({
      client_id: client.id,
      status: 'in_progress',
    })
  }

  return NextResponse.json({ ok: true })
}
