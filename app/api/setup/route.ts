import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

// One-time setup endpoint. Delete this file after first use.
export async function POST(req: Request) {
  const { email, password, name } = await req.json()
  const supabase = createServiceClient()

  const { data: { user }, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('coach').upsert({ id: user!.id, email, name: name ?? '' })

  return NextResponse.json({ ok: true })
}
