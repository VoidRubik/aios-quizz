import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { QuestionnairePage } from './questionnaire-page'
import { ConfirmationPage } from './confirmation-page'
import { ResultsReadyPage } from './results-ready-page'

export default async function TokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, submissions(id, status)')
    .eq('token', token)
    .single()

  if (!client) notFound()

  const submission = (client.submissions as any[])?.[0]
  const status = submission?.status ?? 'not_started'

  if (status === 'released') {
    return <ResultsReadyPage token={token} clientName={client.name} />
  }

  if (status === 'submitted' || status === 'reviewing') {
    return <ConfirmationPage clientName={client.name} />
  }

  const answers = status === 'in_progress' && submission
    ? await loadAnswers(supabase, submission.id)
    : {}

  return (
    <QuestionnairePage
      token={token}
      clientName={client.name}
      initialAnswers={answers}
    />
  )
}

async function loadAnswers(supabase: ReturnType<typeof import('@/lib/supabase/service')['createServiceClient']>, submissionId: string) {
  const { data } = await supabase
    .from('answers')
    .select('trait_id, stage, value')
    .eq('submission_id', submissionId)
  const map: Record<string, Record<string, string>> = {}
  for (const row of data ?? []) {
    if (!map[row.trait_id]) map[row.trait_id] = {}
    if (row.value) map[row.trait_id][row.stage] = row.value
  }
  return map
}
