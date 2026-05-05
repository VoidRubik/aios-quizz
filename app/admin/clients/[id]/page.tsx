import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { ReviewClient } from './review-client'

export default async function ClientReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, email, created_at, submissions(id, status, submitted_at, released_at, coach_note, cartilla_override)')
    .eq('id', id)
    .single()

  if (!client) notFound()

  const submission = (client.submissions as any[])?.[0]

  const { data: typeRows } = await supabase
    .from('personality_types')
    .select('id, slug, name, cluster, default_cartilla, traits(id, position, text)')
    .order('id')

  const types = (typeRows ?? []).map((t: any) => ({
    ...t,
    traits: (t.traits as any[]).sort((a: any, b: any) => a.position - b.position),
  }))

  const { data: answerRows } = submission
    ? await supabase
        .from('answers')
        .select('trait_id, stage, value, original_value, is_coach_edit')
        .eq('submission_id', submission.id)
    : { data: [] }

  return (
    <ReviewClient
      client={client}
      submission={submission ?? null}
      types={types}
      answerRows={answerRows ?? []}
    />
  )
}
