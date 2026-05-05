import type { AnswersMap, Cluster, FullResult, Stage, StageResult, TypeSlug } from './types'

const STAGES: Stage[] = ['ninez', 'adolescencia', 'juventud', 'vejez']
const TYPE_SLUGS: TypeSlug[] = ['solitario','sensitivo','agudo','estructurado','energetico','expansivo','carismatico']
const CLUSTER_MAP: Record<TypeSlug, Cluster> = {
  solitario: 'racional',
  sensitivo: 'emocional',
  agudo: 'emocional',
  estructurado: 'racional',
  energetico: 'motriz',
  expansivo: 'motriz',
  carismatico: 'universal',
}

export function computeResult(
  answers: AnswersMap,
  traitIdsByType: Record<TypeSlug, string[]>
): FullResult {
  const stages = {} as Record<Stage, StageResult>

  for (const stage of STAGES) {
    stages[stage] = computeStage(answers, traitIdsByType, stage)
  }

  return { stages, canonical: stages.juventud }
}

function computeStage(
  answers: AnswersMap,
  traitIdsByType: Record<TypeSlug, string[]>,
  stage: Stage
): StageResult {
  const raw = {} as Record<TypeSlug, number>

  for (const slug of TYPE_SLUGS) {
    const traits = traitIdsByType[slug] ?? []
    if (traits.length === 0) { raw[slug] = 0; continue }
    const siCount = traits.filter(id => answers[id]?.[stage] === 'si').length
    raw[slug] = siCount / traits.length
  }

  const totalRaw = TYPE_SLUGS.reduce((s, t) => s + raw[t], 0)

  if (totalRaw === 0) {
    return {
      raw,
      normalized: Object.fromEntries(TYPE_SLUGS.map(t => [t, 0])) as Record<TypeSlug, number>,
      dominant: null, second: null, ratio1: null, ratio2: null,
      carismaIndex: null, enfasis: null,
    }
  }

  const normalized = {} as Record<TypeSlug, number>
  for (const slug of TYPE_SLUGS) {
    normalized[slug] = raw[slug] / totalRaw
  }

  const sorted = [...TYPE_SLUGS].sort((a, b) => normalized[b] - normalized[a])
  const dominant = sorted[0]
  const second = sorted[1]
  const n1 = normalized[dominant]
  const n2 = normalized[second]
  const ratio1 = n1 / (n1 + n2)
  const ratio2 = n2 / (n1 + n2)
  const carismaIndex = (1 - ratio1) * 2

  return {
    raw, normalized, dominant, second,
    ratio1, ratio2, carismaIndex,
    enfasis: CLUSTER_MAP[dominant],
  }
}
