import { createServiceClient } from '@/lib/supabase/service'
import { WizardClient } from './wizard-client'

interface Props {
  token: string
  clientName: string
  initialAnswers: Record<string, Record<string, string>>
}

export async function QuestionnairePage({ token, clientName, initialAnswers }: Props) {
  const supabase = createServiceClient()
  const { data: typeRows } = await supabase
    .from('personality_types')
    .select('id, slug, name, traits(id, position, text)')
    .order('id')

  const types = (typeRows ?? []).map((t: any) => ({
    slug: t.slug,
    name: t.name,
    traits: (t.traits as any[]).sort((a: any, b: any) => a.position - b.position),
  }))

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <h1 className="font-semibold">Hola, {clientName}</h1>
        <p className="text-sm text-muted-foreground">Responde con sinceridad sobre cada etapa de tu vida.</p>
      </header>
      <WizardClient token={token} types={types} initialAnswers={initialAnswers} />
    </div>
  )
}
