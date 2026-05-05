export type Stage = 'ninez' | 'adolescencia' | 'juventud' | 'vejez'
export type TypeSlug = 'solitario' | 'sensitivo' | 'agudo' | 'estructurado' | 'energetico' | 'expansivo' | 'carismatico'
export type Cluster = 'emocional' | 'motriz' | 'racional' | 'universal'
export type Answer = 'si' | 'no' | null

export interface PersonalityType {
  slug: TypeSlug
  name: string
  cluster: Cluster
  traitCount: number
  defaultCartilla: Partial<Cartilla>
}

export interface Trait {
  id: string
  typeSlug: TypeSlug
  position: number
  text: string
}

// answers keyed by traitId → stage → value
export type AnswersMap = Record<string, Record<Stage, Answer>>

export interface StageResult {
  raw: Record<TypeSlug, number>
  normalized: Record<TypeSlug, number>
  dominant: TypeSlug | null
  second: TypeSlug | null
  ratio1: number | null   // dominant's share of top-two
  ratio2: number | null
  carismaIndex: number | null
  enfasis: Cluster | null
}

export interface FullResult {
  stages: Record<Stage, StageResult>
  canonical: StageResult  // = stages.juventud
}

export interface Cartilla {
  polaridad: string
  glandulaMaestra: string
  glandulaSubsidiaria: string
  enfasisGenetico: string
  dictum: string
  anhelo: string
  pecadoCapital: string
  virtud: string
  susceptibilidad: string
  rasgoDominante: string
  trabajoARealizar: string
}

export type SubmissionStatus = 'not_started' | 'in_progress' | 'submitted' | 'reviewing' | 'released'
