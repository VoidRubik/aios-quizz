# Heptagrama Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Heptagrama web app — psychological assessment tool with 7 personality types, 162 traits, 4 life stages, mandatory coach review gate, and PDF results download.

**Architecture:** Next.js 15 App Router. Supabase (Postgres + Auth + Storage). Pure TypeScript calc engine shared client/server. Token-based client access, email/password coach auth. All client-facing mutations go through Next.js route handlers (service role key), not direct Supabase client.

**Tech Stack:** Next.js 15, TypeScript, Supabase, Tailwind CSS, shadcn/ui, @react-pdf/renderer, Recharts, Zod, TanStack Query, Vitest.

---

## File map

```
app/
  admin/
    login/page.tsx
    layout.tsx                   ← auth guard
    page.tsx                     ← dashboard
    clients/
      new/page.tsx
      [id]/page.tsx              ← review screen
    settings/page.tsx
  q/[token]/page.tsx             ← questionnaire (client)
  r/[token]/pdf/route.ts         ← PDF download handler
  api/
    answers/route.ts             ← auto-save answers
    submit/route.ts              ← submit questionnaire
    clients/route.ts             ← create client
    release/[id]/route.ts        ← release submission
lib/
  heptagrama/
    types.ts                     ← domain types
    calc.ts                      ← pure calc engine
    seed-data.ts                 ← all 162 traits + type metadata
  supabase/
    client.ts                    ← browser client
    server.ts                    ← server client (cookies)
    service.ts                   ← service-role client (mutations)
  pdf/
    results-note.tsx             ← @react-pdf/renderer component
components/
  admin/
    client-table.tsx
    answer-grid.tsx
    results-sidebar.tsx
    cartilla-editor.tsx
    release-button.tsx
  questionnaire/
    wizard.tsx
    type-step.tsx
    trait-row.tsx
supabase/
  migrations/001_initial.sql
  seed.sql
middleware.ts
```

---

## Phase 1 — Foundation

### Task 1: Scaffold project

**Files:** `package.json`, `tsconfig.json`, `next.config.ts`, `.env.local.example`

- [ ] In `c:\Users\Shanty\Documents\Quizz de Semiologia`, run:
```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
```

- [ ] Install dependencies:
```bash
npm install @supabase/supabase-js @supabase/ssr @tanstack/react-query zod @react-pdf/renderer recharts
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom
npx shadcn@latest init -d
npx shadcn@latest add button input label textarea card badge table tabs collapsible toggle separator dialog
```

- [ ] Create `.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] Add to `package.json` scripts:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] Commit:
```bash
git add -A && git commit -m "feat: scaffold Next.js 15 project with Supabase and shadcn"
```

---

### Task 2: Domain types

**Files:** `lib/heptagrama/types.ts`

- [ ] Create `lib/heptagrama/types.ts`:
```ts
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
```

- [ ] Commit:
```bash
git add lib/heptagrama/types.ts && git commit -m "feat: add domain types"
```

---

### Task 3: Calc engine + tests

**Files:** `lib/heptagrama/calc.ts`, `lib/heptagrama/calc.test.ts`

- [ ] Write failing tests first — create `lib/heptagrama/calc.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { computeResult } from './calc'
import type { AnswersMap } from './types'

const TRAIT_IDS_BY_TYPE: Record<string, string[]> = {
  agudo: ['a1','a2','a3'],
  solitario: ['s1','s2'],
}

describe('computeResult', () => {
  it('computes raw score as count(si)/total', () => {
    const answers: AnswersMap = {
      a1: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      a2: { ninez: null, adolescencia: 'no', juventud: 'si', vejez: null },
      a3: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      s1: { ninez: null, adolescencia: 'no', juventud: 'no', vejez: null },
      s2: { ninez: null, adolescencia: 'no', juventud: 'no', vejez: null },
    }
    const result = computeResult(answers, TRAIT_IDS_BY_TYPE as any)
    expect(result.stages.adolescencia.raw.agudo).toBeCloseTo(2/3)
    expect(result.stages.adolescencia.raw.solitario).toBeCloseTo(0)
  })

  it('normalizes scores to sum to 1', () => {
    const answers: AnswersMap = {
      a1: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      a2: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      a3: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      s1: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      s2: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
    }
    const result = computeResult(answers, TRAIT_IDS_BY_TYPE as any)
    const sum = Object.values(result.stages.adolescencia.normalized).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1)
  })

  it('identifies dominant type correctly', () => {
    const answers: AnswersMap = {
      a1: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      a2: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      a3: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      s1: { ninez: null, adolescencia: 'no', juventud: 'no', vejez: null },
      s2: { ninez: null, adolescencia: 'no', juventud: 'no', vejez: null },
    }
    const result = computeResult(answers, TRAIT_IDS_BY_TYPE as any)
    expect(result.stages.adolescencia.dominant).toBe('agudo')
  })

  it('computes carisma index as (1 - ratio1) * 2', () => {
    const answers: AnswersMap = {
      a1: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      a2: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      a3: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      s1: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      s2: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
    }
    const result = computeResult(answers, TRAIT_IDS_BY_TYPE as any)
    const { ratio1, carismaIndex } = result.stages.adolescencia
    if (ratio1 !== null && carismaIndex !== null) {
      expect(carismaIndex).toBeCloseTo((1 - ratio1) * 2)
    }
  })

  it('returns null dominants when stage has no answers', () => {
    const answers: AnswersMap = {
      a1: { ninez: null, adolescencia: null, juventud: 'si', vejez: null },
      a2: { ninez: null, adolescencia: null, juventud: 'si', vejez: null },
      a3: { ninez: null, adolescencia: null, juventud: 'si', vejez: null },
      s1: { ninez: null, adolescencia: null, juventud: 'no', vejez: null },
      s2: { ninez: null, adolescencia: null, juventud: 'no', vejez: null },
    }
    const result = computeResult(answers, TRAIT_IDS_BY_TYPE as any)
    expect(result.stages.adolescencia.dominant).toBeNull()
    expect(result.stages.adolescencia.carismaIndex).toBeNull()
  })

  it('canonical equals juventud', () => {
    const answers: AnswersMap = {
      a1: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      a2: { ninez: null, adolescencia: 'no', juventud: 'si', vejez: null },
      a3: { ninez: null, adolescencia: 'no', juventud: 'si', vejez: null },
      s1: { ninez: null, adolescencia: 'si', juventud: 'no', vejez: null },
      s2: { ninez: null, adolescencia: 'si', juventud: 'no', vejez: null },
    }
    const result = computeResult(answers, TRAIT_IDS_BY_TYPE as any)
    expect(result.canonical).toBe(result.stages.juventud)
  })
})
```

- [ ] Run tests, confirm they fail:
```bash
npm run test:run lib/heptagrama/calc.test.ts
```
Expected: `calc.ts not found` or similar import error.

- [ ] Create `lib/heptagrama/calc.ts`:
```ts
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
```

- [ ] Run tests, confirm they pass:
```bash
npm run test:run lib/heptagrama/calc.test.ts
```
Expected: all 6 tests PASS.

- [ ] Commit:
```bash
git add lib/heptagrama/calc.ts lib/heptagrama/calc.test.ts && git commit -m "feat: add pure calc engine with tests"
```

---

### Task 4: Seed data

**Files:** `lib/heptagrama/seed-data.ts`

- [ ] Create `lib/heptagrama/seed-data.ts` with all 162 traits (verbatim from Excel). This file is the source of truth for `personality_types` and `traits` DB tables:

```ts
import type { PersonalityType } from './types'

export const PERSONALITY_TYPES: PersonalityType[] = [
  {
    slug: 'solitario', name: 'Solitario', cluster: 'racional', traitCount: 23,
    defaultCartilla: {},
  },
  {
    slug: 'sensitivo', name: 'Sensitivo', cluster: 'emocional', traitCount: 22,
    defaultCartilla: {},
  },
  {
    slug: 'agudo', name: 'Agudo', cluster: 'emocional', traitCount: 23,
    defaultCartilla: {
      polaridad: 'Negativo',
      glandulaMaestra: 'Tiroides',
      glandulaSubsidiaria: 'Pituitaria anterior',
      enfasisGenetico: 'Emocional',
      dictum: 'Yo gano',
      anhelo: 'Reconocimiento',
      pecadoCapital: 'Envidia',
      virtud: 'Caridad',
      susceptibilidad: 'Crítica',
      rasgoDominante: 'Confusión',
      trabajoARealizar: 'Corrimientos a Estructurado, equilibrio con los énfasis genéticos: Motriz y Racional. Complementos con el resto de tipos del Heptagrama.',
    },
  },
  {
    slug: 'estructurado', name: 'Estructurado', cluster: 'racional', traitCount: 23,
    defaultCartilla: {},
  },
  {
    slug: 'energetico', name: 'Energético', cluster: 'motriz', traitCount: 23,
    defaultCartilla: {},
  },
  {
    slug: 'expansivo', name: 'Expansivo', cluster: 'motriz', traitCount: 20,
    defaultCartilla: {},
  },
  {
    slug: 'carismatico', name: 'Carismático', cluster: 'universal', traitCount: 28,
    defaultCartilla: {},
  },
]

export const TRAITS_BY_TYPE: Record<string, string[]> = {
  solitario: [
    'Tienen muy poca energía.',
    'Son negativos y pesimistas.',
    'Carecen del deseo de cambiar algo o de la energía para hacerlo o de ambas.',
    'Cuando tienen un objetivo son persistentes. Pueden ser genios.',
    'Prácticos, fríos, obsesivos y perfeccionistas.',
    'Disfrutan la soledad y el silencio más que ningún otro tipo; pero no son tímidos.',
    'Independientes. Observadores.',
    'En reuniones tienden a aislarse. Introvertidos. Privados.',
    'Son distantes e inexpresivos pero de emociones muy profundas y subterráneas.',
    'Saben escuchar, son pacientes.',
    'Profesionales de los puntos negros, aunque ellos se consideran «realistas».',
    'Sienten predilección por lugares apartados, fríos y oscuros.',
    'Necesitan a quién desobedecer, rechazar o ignorar.',
    'Tienen pocos amigos pero muy buenos.',
    'Casi no necesitan la aprobación de los demás.',
    'Selectivos, sinceros, genuinos y fieles a la causa. Discretos.',
    'Son de trato difícil por sus emociones inestables.',
    'Son posesivos y avaros. Acumulativos; coleccionan cosas pequeñas.',
    'Imaginativos y de temperamento artístico.',
    'Tienen raro sentido del humor. Son conservadores.',
    'Suelen vestir de colores oscuros u opacos.',
    'Son buenos archivistas, bibliotecarios, contadores, financieros, administradores.',
    'Confiables con números y libros. Excelentes en ocupaciones que requieran precisión y atención minuciosa.',
  ],
  sensitivo: [
    'Son el tipo que genera menos energía. Tienen el metabolismo más lento.',
    'Son optimistas y positivos.',
    'No tienen determinación.',
    'Nunca andan solos. Buscan calor y energía en otras personas.',
    'Son muy desordenados. Duermen mucho. Son friolentos.',
    'No pueden discernir ni decidir. Aceptan todo y a todos.',
    'Menosprecian sus propias opiniones.',
    'Dan todo sin esperar nada a cambio, más que compañía.',
    'Son amantes intuitivos, muy sensibles y sensuales.',
    'Gozan intensamente de la naturaleza.',
    'Extraordinariamente sensitivos.',
    'Tienen buena comunicación con plantas, animales y niños.',
    'No son competitivos, no juzgan.',
    'Son hogareños. Les gusta dar y recibir masajes.',
    'Son muy desprendidos de objetos materiales, personas o situaciones.',
    'Armoniosos, gentiles y cálidos.',
    'Son pasivos, vegetativos hasta el rasgo de inexistencia.',
    'Sedentarios: no suelen cambiar de domicilio ni de trabajo.',
    'Buscan la comodidad y moverse poco para ahorrar energía.',
    'Sus casas son acogedoras y sus ropas holgadas.',
    'Buenos artistas y educadores. Enfermeros, trabajadores sociales, decoradores, recepcionistas, diseñadores, fisioterapeutas.',
    'Excelentes en ocupaciones que requieran contacto humano de manera reposada y armónica.',
  ],
  agudo: [
    'Tienen exceso de energía, difícil de contener en su cuerpo reducido.',
    'Son muy inquietos y rápidos. Actividad de tipo nervioso.',
    'Tienen una gran rapidez intelectual. Piensan en zig zag. Son muy agudos.',
    'Enredados, no dicen las cosas de manera clara y directa.',
    'Intrigosos, astutos y manipuladores.',
    'Son buenos para hacer dinero. Emprendedores.',
    'Se involucran simultáneamente en muchos proyectos que suelen embrollar.',
    'Buscan ser el centro de atención. Son envidiosos y competitivos: siempre quieren ganar.',
    'Si se sienten acorralados, se hacen las víctimas. Se justifican, no aceptan sus equivocaciones.',
    'Divertidos anfitriones. Efectistas para vestirse.',
    'Necesitan la admiración de los otros, más que ninguno. Son desconfiados y mitómanos.',
    'No soportan ser ignorados. Tienden a la hipocondría.',
    'Pecados menores: cleptomanía.',
    'Estrategas laberínticos: practican el terrorismo intelectual y emocional.',
    'Tienen gran ingenio verbal y capacidad de persuasión.',
    'Caprichudos y paranoicos. Se defienden hasta cuando no los atacan.',
    'Tienen una gran capacidad para gozar la vida. Gran sentido del humor.',
    'Actúan por interés propio y creen que así son los demás.',
    'Les gusta conocer las reglas para romperlas.',
    'Se realizan al encontrar rebajas.',
    'Muy creativos. Líderes verborreicos: se escuchan cuando hablan.',
    'Son vendedores natos. Buenos políticos, comediantes, detectives, fiscalistas, imitadores.',
    'Excelentes en ocupaciones que requieran de gran movilidad y dinamismo, de rapidez tanto física como mental.',
  ],
  estructurado: [
    'Tienen mucha energía pero son pausados, metódicos, tranquilos.',
    'Son racionales, moderados y objetivos.',
    'Gran capacidad analítica. Buscan la verdad.',
    'Excesivamente lógicos, fríos y estructurados. Didácticos hasta la exasperación.',
    'Para ellos no hay nada trivial. Amplia visión.',
    'Les gusta acumular datos. Investigan el origen de las cosas.',
    'Buscan claridad y síntesis en sus vidas. Les fascinan las estadísticas.',
    'Son soberbios, inflexibles y arrogantes.',
    'No concretan. Planean en exceso.',
    'Son perfeccionistas. Sumamente ordenados.',
    'Son rutinarios, monótonos, predecibles.',
    'Cuando algo les gusta lo repiten e incorporan a sus vidas.',
    'Establecen jerarquías. Clasifican a las personas y a las cosas.',
    'Son pedantes. Poco emotivos. Solemnes.',
    'Tienen un gran sentido de la justicia.',
    'Son paternalistas, excesivamente responsables. Incluso suelen asumir responsabilidades ajenas.',
    'Grandes líderes por convencimiento. Extrovertidos y públicos.',
    'Les gusta ser libres. Son independientes.',
    'Amantes del conocimiento.',
    'Consejeros natos. Creen saber lo que es mejor para ti o para todos.',
    'Son grandes conciliadores racionales.',
    'Buenos académicos, científicos, planificadores, escritores, profesores, asesores.',
    'Excelentes en ocupaciones que requieran planeación analítica, investigación académica y comunicación estructurada.',
  ],
  energetico: [
    'Tienen gran vitalidad. Hiperactivos. Duermen poco.',
    'Son competitivos, necios, bruscos en ademanes y palabras.',
    'Son grandes hacedores. En cada proyecto se entregan hasta concretarlo.',
    'Son líderes impositivos y beligerantes.',
    'Constantemente buscan la acción que les permita liberar su enorme energía.',
    'La impaciencia los lleva a no saber delegar. Se precipitan.',
    'Imparten órdenes a diestra y siniestra. Prefieren que los obedezcan a que los amen.',
    'Tienen un gran sentido práctico. Buenos estrategas.',
    'Todo es URGENTE. Lo que les concierne lo exigen para ayer.',
    'Creen en aquello que se les puede demostrar. Son tercos y escépticos.',
    'Son fácilmente irritables, agresivos y dominantes.',
    'Si no encuentran cómo canalizar su energía, se autodestruyen.',
    'Son leales, nobles y apasionados. Saben perdonar. Solo tienen amigos o enemigos.',
    'Piden y dan verdades directas y brutalmente. Son MUY celosos.',
    'Buscan tener retos que vencer. Se fijan metas y van de una en otra.',
    'Buscan su libertad y les gustan los espacios abiertos.',
    'El peligro los excita. Viven al filo de la navaja. Son rebeldes, no soportan la autoridad.',
    'No planean. Van directo a la acción. Son impulsivos.',
    'Las depresiones pueden encadenarlos a vicios.',
    'Exagerados. No tienen límites, todo es a lo grande.',
    'No les gustan las sutilezas. No soportan la traición. Son tímidos.',
    'Buenos empresarios, políticos, deportistas, militares, comerciantes, organizadores.',
    'Excelentes en ocupaciones que requieran capacidad de mando, visión práctica y resultados inmediatos.',
  ],
  expansivo: [
    'Tienen poca energía.',
    'Son dispersos, atolondrados y entusiastas.',
    'Hacen mil cosas y no concretan ninguna, pero gozan todas.',
    'Excéntricos, alegres, amigueros, les encantan las fiestas y reuniones.',
    'Grandes Gourmets: su fascinación es la comida.',
    'Excelentes anfitriones. Maternales. Apapachones.',
    'Coleccionan amigos y cosas raras. Sus vestimentas suelen ser estrafalarias.',
    'Despilfarradores. Muy generosos. Lo dan todo y más.',
    'Son los que más sufren con el dolor ajeno.',
    'Sus casas son de puertas abiertas. Hospedan a menesterosos.',
    'Son populares. Quieren y se dan a querer de inmediato.',
    'Requieren de la aceptación de los demás para vivir. No soportan el rechazo.',
    'Compasivos, vanidosos, ególatras, inseguros.',
    'Castigan con el látigo de su desprecio.',
    'Optimistas. Se sienten comprometidos a mostrar su felicidad.',
    'Les encanta conciliar afectivamente.',
    'Sentimentaloides, manipuladores, prolíficos. Ríen y lloran con facilidad.',
    'Tienen aptitud para las lenguas.',
    'Grandes chefs, artistas, locutores, médicos, traductores, diplomáticos, magos de las relaciones públicas.',
    'Excelentes en ocupaciones que requieran trato social, espíritu de servicio y convivencia entusiasta.',
  ],
  carismatico: [
    'Constituyen el tipo más energético de todo el Heptagrama.',
    'Tienen el metabolismo más rápido.',
    'Procesan muchísima energía. Es difícil seguirles el paso.',
    'Gran magnetismo. Irradian ternura, son muy intensos.',
    'Tienen polaridad universal. Extraordinaria energía sexual.',
    'Volátil, ligero, eléctrico y veloz.',
    'Gesticulan mucho al hablar y danzan al caminar.',
    'Carismáticos, creativos, idealistas.',
    'Contagian alegría y buen humor.',
    'Estimulan los aspectos activos y positivos de los demás tipos.',
    'Ingenuos, optimistas irracionales, entusiastas.',
    'Suelen no ver el lado oscuro o negativo de las cosas o las personas.',
    'Tienen grandes proyectos. Son dispersos.',
    'Ven el lado positivo en todo. Son muy adaptables.',
    'Visionarios. No tienen los pies en la tierra.',
    'Dan lo mejor de sí mismos. Son serviciales.',
    'Son amigables pero no tienen amigos.',
    'Viven la vida con intensidad. Pero su entusiasmo y energía pueden destruirlos.',
    'Son como una centella que se fulmina a sí misma.',
    'Suelen morir en forma súbita y a temprana edad.',
    'No son impositivos ni manipuladores. Su liderazgo es por contagio.',
    'El efecto carismático hace que los tipos pasivos se comporten con la ambición y asertividad de los tipos activos. Y a la inversa: dulcifica y enternece a los tipos activos, los vuelve sensibles y delicados.',
    'Pueden canalizar su energía hacia la sexualidad o el misticismo con idéntica intensidad.',
    'Tienen el entusiasmo infantil aunado a ideales trascendentes.',
    'Se olvidan de sí mismos. Hay que alimentarlos y vestirlos.',
    'Constituyen el elemento agregado en los demás tipos; aquello que los lleva a evolucionar al tipo subsiguiente.',
    'Grandes líderes naturales, místicos, show men: cantantes, bailarines, actores, comediantes, comunicadores.',
    'Excelentes en ocupaciones que requieran trato con multitudes, comunicación intensa y desparpajada animación.',
  ],
}
```

- [ ] Commit:
```bash
git add lib/heptagrama/seed-data.ts && git commit -m "feat: add seed data (162 traits, 7 types)"
```

---

### Task 5: Database migration

**Files:** `supabase/migrations/001_initial.sql`, `supabase/seed.sql`

- [ ] Create `supabase/migrations/001_initial.sql`:
```sql
-- Enums
create type submission_status as enum ('not_started','in_progress','submitted','reviewing','released');
create type stage as enum ('ninez','adolescencia','juventud','vejez');
create type answer_value as enum ('si','no');
create type cluster as enum ('emocional','motriz','racional','universal');

-- Coach (single row)
create table coach (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  logo_url text
);

-- Settings (single row, id = 1)
create table settings (
  id int primary key default 1 check (id = 1),
  auto_release bool not null default false
);
insert into settings (id, auto_release) values (1, false);

-- Personality types
create table personality_types (
  id serial primary key,
  slug text not null unique,
  name text not null,
  cluster cluster not null,
  default_cartilla jsonb not null default '{}'
);

-- Traits
create table traits (
  id uuid primary key default gen_random_uuid(),
  type_id int not null references personality_types(id) on delete cascade,
  position int not null,
  text text not null,
  unique (type_id, position)
);

-- Clients
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  token text not null unique,
  internal_notes text,
  created_at timestamptz not null default now()
);

-- Submissions (one per client)
create table submissions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references clients(id) on delete cascade,
  status submission_status not null default 'not_started',
  submitted_at timestamptz,
  released_at timestamptz,
  coach_note text,
  cartilla_override jsonb not null default '{}'
);

-- Answers
create table answers (
  submission_id uuid not null references submissions(id) on delete cascade,
  trait_id uuid not null references traits(id) on delete cascade,
  stage stage not null,
  value answer_value,
  original_value answer_value,  -- immutable client answer, set on submit
  is_coach_edit bool not null default false,
  primary key (submission_id, trait_id, stage)
);

-- Indexes
create index on clients (token);
create index on answers (submission_id);
```

- [ ] Create `supabase/seed.sql` — run after migration to populate personality_types + traits. Generate from seed-data.ts manually or run the Node script in Task 6. For now create the file with a comment:
```sql
-- Run: node scripts/generate-seed.mjs > supabase/seed.sql
-- Then: psql ... < supabase/seed.sql
-- Or apply via Supabase dashboard SQL editor.
```

- [ ] Commit:
```bash
git add supabase/ && git commit -m "feat: add database migration schema"
```

---

### Task 6: Supabase clients + seed script

**Files:** `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/service.ts`, `scripts/seed-db.mjs`, `middleware.ts`

- [ ] Create `lib/supabase/client.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] Create `lib/supabase/server.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] Create `lib/supabase/service.ts`:
```ts
import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

- [ ] Create `middleware.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (request.nextUrl.pathname.startsWith('/admin') &&
      !request.nextUrl.pathname.startsWith('/admin/login')) {
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

- [ ] Create `scripts/seed-db.mjs` — reads seed-data.ts (compiled) and inserts into DB:
```js
// Run: node scripts/seed-db.mjs
// Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// Paste PERSONALITY_TYPES and TRAITS_BY_TYPE inline here (copy from seed-data.ts, remove TS types)
const PERSONALITY_TYPES = [
  { slug: 'solitario', name: 'Solitario', cluster: 'racional', traitCount: 23, defaultCartilla: {} },
  { slug: 'sensitivo', name: 'Sensitivo', cluster: 'emocional', traitCount: 22, defaultCartilla: {} },
  { slug: 'agudo', name: 'Agudo', cluster: 'emocional', traitCount: 23, defaultCartilla: { polaridad: 'Negativo', glandulaMaestra: 'Tiroides', glandulaSubsidiaria: 'Pituitaria anterior', enfasisGenetico: 'Emocional', dictum: 'Yo gano', anhelo: 'Reconocimiento', pecadoCapital: 'Envidia', virtud: 'Caridad', susceptibilidad: 'Crítica', rasgoDominante: 'Confusión', trabajoARealizar: 'Corrimientos a Estructurado, equilibrio con los énfasis genéticos: Motriz y Racional. Complementos con el resto de tipos del Heptagrama.' } },
  { slug: 'estructurado', name: 'Estructurado', cluster: 'racional', traitCount: 23, defaultCartilla: {} },
  { slug: 'energetico', name: 'Energético', cluster: 'motriz', traitCount: 23, defaultCartilla: {} },
  { slug: 'expansivo', name: 'Expansivo', cluster: 'motriz', traitCount: 20, defaultCartilla: {} },
  { slug: 'carismatico', name: 'Carismático', cluster: 'universal', traitCount: 28, defaultCartilla: {} },
]

// (paste TRAITS_BY_TYPE from seed-data.ts here with JS syntax)
const TRAITS_BY_TYPE = { /* copy from seed-data.ts */ }

async function seed() {
  for (const pt of PERSONALITY_TYPES) {
    const { data: typeRow } = await supabase
      .from('personality_types')
      .upsert({ slug: pt.slug, name: pt.name, cluster: pt.cluster, default_cartilla: pt.defaultCartilla }, { onConflict: 'slug' })
      .select()
      .single()

    const traits = TRAITS_BY_TYPE[pt.slug] ?? []
    await supabase.from('traits').upsert(
      traits.map((text, i) => ({ type_id: typeRow.id, position: i + 1, text })),
      { onConflict: 'type_id,position' }
    )
    console.log(`Seeded ${pt.name}: ${traits.length} traits`)
  }
  console.log('Done')
}

seed().catch(console.error)
```

- [ ] Set up Supabase project locally (or remote), apply migration, run seed:
```bash
# Apply migration via Supabase CLI or dashboard SQL editor
# Then seed:
node scripts/seed-db.mjs
```

- [ ] Commit:
```bash
git add lib/supabase/ middleware.ts scripts/ && git commit -m "feat: add Supabase clients, middleware, seed script"
```

---

## Phase 2 — Client Questionnaire

### Task 7: Token validation + page state machine

**Files:** `app/q/[token]/page.tsx`, `app/api/answers/route.ts`, `app/api/submit/route.ts`

- [ ] Create `app/q/[token]/page.tsx` (server component — validates token, determines which state to render):
```tsx
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
    .select('id, name, submissions(id, status, cartilla_override)')
    .eq('token', token)
    .single()

  if (!client) notFound()

  const submission = client.submissions?.[0]
  const status = submission?.status ?? 'not_started'

  if (status === 'released') {
    return <ResultsReadyPage token={token} clientName={client.name} />
  }

  if (status === 'submitted' || status === 'reviewing') {
    return <ConfirmationPage clientName={client.name} />
  }

  // not_started or in_progress → show questionnaire
  // Load existing answers for resume
  const answers = status === 'in_progress' && submission
    ? await loadAnswers(supabase, submission.id)
    : {}

  return (
    <QuestionnairePage
      token={token}
      clientName={client.name}
      submissionId={submission?.id ?? null}
      initialAnswers={answers}
    />
  )
}

async function loadAnswers(supabase: any, submissionId: string) {
  const { data } = await supabase
    .from('answers')
    .select('trait_id, stage, value')
    .eq('submission_id', submissionId)
  const map: Record<string, Record<string, string>> = {}
  for (const row of data ?? []) {
    if (!map[row.trait_id]) map[row.trait_id] = {}
    map[row.trait_id][row.stage] = row.value
  }
  return map
}
```

- [ ] Create `app/q/[token]/confirmation-page.tsx`:
```tsx
export function ConfirmationPage({ clientName }: { clientName: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold">Gracias, {clientName}</h1>
        <p className="text-muted-foreground">
          Tu coach revisará tus resultados y te avisará cuando estén listos.
        </p>
      </div>
    </div>
  )
}
```

- [ ] Create `app/q/[token]/results-ready-page.tsx`:
```tsx
'use client'
export function ResultsReadyPage({ token, clientName }: { token: string; clientName: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-2xl font-semibold">Tus resultados están listos, {clientName}</h1>
        <a
          href={`/r/${token}/pdf`}
          className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium"
          download
        >
          Descargar resultados (PDF)
        </a>
      </div>
    </div>
  )
}
```

- [ ] Create `app/api/answers/route.ts` — auto-save single answer:
```ts
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  token: z.string(),
  traitId: z.string().uuid(),
  stage: z.enum(['ninez','adolescencia','juventud','vejez']),
  value: z.enum(['si','no']).nullable(),
})

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const { token, traitId, stage, value } = parsed.data
  const supabase = createServiceClient()

  // Validate token + get/create submission
  const { data: client } = await supabase
    .from('clients')
    .select('id, submissions(id, status)')
    .eq('token', token)
    .single()

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let submission = client.submissions?.[0]
  if (submission?.status === 'submitted' || submission?.status === 'released') {
    return NextResponse.json({ error: 'Locked' }, { status: 403 })
  }

  // Create submission if not exists
  if (!submission) {
    const { data } = await supabase
      .from('submissions')
      .insert({ client_id: client.id, status: 'in_progress' })
      .select()
      .single()
    submission = data
  } else if (submission.status === 'not_started') {
    await supabase.from('submissions').update({ status: 'in_progress' }).eq('id', submission.id)
  }

  // Upsert answer (never touch original_value after first write)
  const { data: existing } = await supabase
    .from('answers')
    .select('original_value')
    .eq('submission_id', submission.id)
    .eq('trait_id', traitId)
    .eq('stage', stage)
    .single()

  await supabase.from('answers').upsert({
    submission_id: submission.id,
    trait_id: traitId,
    stage,
    value,
    original_value: existing?.original_value ?? value, // set once, never changed
    is_coach_edit: false,
  }, { onConflict: 'submission_id,trait_id,stage' })

  return NextResponse.json({ ok: true })
}
```

- [ ] Create `app/api/submit/route.ts` — final submit:
```ts
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({ token: z.string() })

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const { token } = parsed.data
  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, submissions(id, status)')
    .eq('token', token)
    .single()

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const submission = client.submissions?.[0]
  if (!submission || submission.status !== 'in_progress') {
    return NextResponse.json({ error: 'Not in progress' }, { status: 400 })
  }

  // Verify all Juventud answers filled
  const { data: traits } = await supabase
    .from('traits')
    .select('id')

  const { data: juventudAnswers } = await supabase
    .from('answers')
    .select('trait_id, value')
    .eq('submission_id', submission.id)
    .eq('stage', 'juventud')

  const answeredTraitIds = new Set(
    (juventudAnswers ?? []).filter(a => a.value !== null).map(a => a.trait_id)
  )
  const allTraitIds = (traits ?? []).map(t => t.id)
  const allJuventudAnswered = allTraitIds.every(id => answeredTraitIds.has(id))

  if (!allJuventudAnswered) {
    return NextResponse.json({ error: 'Juventud incomplete' }, { status: 422 })
  }

  // Copy dominant type's cartilla template → cartilla_override
  const { data: settings } = await supabase.from('settings').select('auto_release').single()
  const newStatus = settings?.auto_release ? 'released' : 'submitted'

  // Compute dominant type for Juventud to seed cartilla
  // (simplified — full calc runs in admin; here we just seed from type default)
  // Load all answers to find dominant
  const { data: allAnswers } = await supabase
    .from('answers')
    .select('trait_id, stage, value')
    .eq('submission_id', submission.id)
    .eq('stage', 'juventud')

  const { data: typeRows } = await supabase
    .from('personality_types')
    .select('id, slug, default_cartilla')

  const { data: traitRows } = await supabase.from('traits').select('id, type_id')
  const traitTypeMap = Object.fromEntries((traitRows ?? []).map(t => [t.id, t.type_id]))
  const typeById = Object.fromEntries((typeRows ?? []).map(t => [t.id, t]))

  // Count si per type
  const siByType: Record<number, number> = {}
  const totalByType: Record<number, number> = {}
  for (const a of allAnswers ?? []) {
    const typeId = traitTypeMap[a.trait_id]
    if (!typeId) continue
    totalByType[typeId] = (totalByType[typeId] ?? 0) + 1
    if (a.value === 'si') siByType[typeId] = (siByType[typeId] ?? 0) + 1
  }

  let dominantTypeId: number | null = null
  let maxRaw = -1
  for (const [tid, total] of Object.entries(totalByType)) {
    const raw = (siByType[Number(tid)] ?? 0) / total
    if (raw > maxRaw) { maxRaw = raw; dominantTypeId = Number(tid) }
  }

  const cartillaOverride = dominantTypeId ? typeById[dominantTypeId]?.default_cartilla ?? {} : {}

  await supabase.from('submissions').update({
    status: newStatus,
    submitted_at: new Date().toISOString(),
    ...(newStatus === 'released' ? { released_at: new Date().toISOString() } : {}),
    cartilla_override: cartillaOverride,
  }).eq('id', submission.id)

  return NextResponse.json({ ok: true, status: newStatus })
}
```

- [ ] Commit:
```bash
git add app/q/ app/api/ && git commit -m "feat: add token page state machine, answer auto-save, submit API"
```

---

### Task 8: Questionnaire wizard UI

**Files:** `app/q/[token]/questionnaire-page.tsx`, `components/questionnaire/wizard.tsx`, `components/questionnaire/type-step.tsx`, `components/questionnaire/trait-row.tsx`

- [ ] Create `components/questionnaire/trait-row.tsx`:
```tsx
'use client'
import { Button } from '@/components/ui/button'
import type { Answer, Stage } from '@/lib/heptagrama/types'

const STAGES: { key: Stage; label: string }[] = [
  { key: 'ninez', label: 'Niñez' },
  { key: 'adolescencia', label: 'Adolescencia' },
  { key: 'juventud', label: 'Juventud' },
  { key: 'vejez', label: 'Vejez' },
]

interface Props {
  traitId: string
  text: string
  answers: Record<Stage, Answer>
  onChange: (traitId: string, stage: Stage, value: Answer) => void
}

export function TraitRow({ traitId, text, answers, onChange }: Props) {
  return (
    <div className="grid grid-cols-[1fr_repeat(4,_80px)] gap-2 items-start py-2 border-b last:border-0">
      <p className="text-sm">{text}</p>
      {STAGES.map(({ key, label }) => {
        const val = answers[key]
        return (
          <div key={key} className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <div className="flex gap-1">
              <Button
                size="sm" variant={val === 'si' ? 'default' : 'outline'}
                className="h-7 px-2 text-xs"
                onClick={() => onChange(traitId, key, val === 'si' ? null : 'si')}
              >Sí</Button>
              <Button
                size="sm" variant={val === 'no' ? 'destructive' : 'outline'}
                className="h-7 px-2 text-xs"
                onClick={() => onChange(traitId, key, val === 'no' ? null : 'no')}
              >No</Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] Create `components/questionnaire/type-step.tsx`:
```tsx
import { TraitRow } from './trait-row'
import type { Answer, Stage } from '@/lib/heptagrama/types'

interface Trait { id: string; text: string }

interface Props {
  typeName: string
  traits: Trait[]
  answers: Record<string, Record<Stage, Answer>>
  onChange: (traitId: string, stage: Stage, value: Answer) => void
}

export function TypeStep({ typeName, traits, answers, onChange }: Props) {
  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold mb-4">{typeName}</h2>
      {traits.map(trait => (
        <TraitRow
          key={trait.id}
          traitId={trait.id}
          text={trait.text}
          answers={(answers[trait.id] ?? { ninez: null, adolescencia: null, juventud: null, vejez: null }) as Record<Stage, Answer>}
          onChange={onChange}
        />
      ))}
    </div>
  )
}
```

- [ ] Create `components/questionnaire/wizard.tsx` (auto-save + step navigation + submit):
```tsx
'use client'
import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { TypeStep } from './type-step'
import type { Answer, Stage } from '@/lib/heptagrama/types'

interface Trait { id: string; text: string; typeSlug: string }
interface PersonalityTypeInfo { slug: string; name: string; traits: Trait[] }

interface Props {
  token: string
  types: PersonalityTypeInfo[]
  initialAnswers: Record<string, Record<string, string>>
  onSubmitted: () => void
}

const STAGES: Stage[] = ['ninez', 'adolescencia', 'juventud', 'vejez']

export function Wizard({ token, types, initialAnswers, onSubmitted }: Props) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Record<Stage, Answer>>>(() => {
    const map: Record<string, Record<Stage, Answer>> = {}
    for (const [traitId, stageMap] of Object.entries(initialAnswers)) {
      map[traitId] = { ninez: null, adolescencia: null, juventud: null, vejez: null, ...stageMap } as Record<Stage, Answer>
    }
    return map
  })
  const [submitting, setSubmitting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveAnswer = useCallback(async (traitId: string, stage: Stage, value: Answer) => {
    await fetch('/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, traitId, stage, value }),
    })
  }, [token])

  const handleChange = useCallback((traitId: string, stage: Stage, value: Answer) => {
    setAnswers(prev => ({
      ...prev,
      [traitId]: { ...(prev[traitId] ?? { ninez: null, adolescencia: null, juventud: null, vejez: null }), [stage]: value }
    }))
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => saveAnswer(traitId, stage, value), 500)
  }, [saveAnswer])

  // Check Juventud complete before showing submit
  const allJuventudAnswered = types.every(t =>
    t.traits.every(trait => {
      const a = answers[trait.id]
      return a?.juventud !== null && a?.juventud !== undefined
    })
  )

  const currentType = types[step]

  const handleSubmit = async () => {
    setSubmitting(true)
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    if (res.ok) onSubmitted()
    else setSubmitting(false)
  }

  const isLastStep = step === types.length - 1

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Paso {step + 1} de {types.length}</span>
        <span>{currentType.name}</span>
      </div>

      <TypeStep
        typeName={currentType.name}
        traits={currentType.traits}
        answers={answers}
        onChange={handleChange}
      />

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
          Anterior
        </Button>
        {isLastStep ? (
          <Button onClick={handleSubmit} disabled={!allJuventudAnswered || submitting}>
            {submitting ? 'Enviando...' : 'Enviar cuestionario'}
          </Button>
        ) : (
          <Button onClick={() => setStep(s => s + 1)}>Siguiente</Button>
        )}
      </div>

      {isLastStep && !allJuventudAnswered && (
        <p className="text-sm text-destructive text-center">
          Completa todas las respuestas de Juventud antes de enviar.
        </p>
      )}
    </div>
  )
}
```

- [ ] Create `app/q/[token]/questionnaire-page.tsx` (loads traits from DB, renders Wizard):
```tsx
import { createServiceClient } from '@/lib/supabase/service'
import { WizardClient } from './wizard-client'

interface Props {
  token: string
  clientName: string
  submissionId: string | null
  initialAnswers: Record<string, Record<string, string>>
}

export async function QuestionnairePage({ token, clientName, submissionId, initialAnswers }: Props) {
  const supabase = createServiceClient()
  const { data: typeRows } = await supabase
    .from('personality_types')
    .select('id, slug, name, traits(id, position, text)')
    .order('id')

  const types = (typeRows ?? []).map(t => ({
    slug: t.slug,
    name: t.name,
    traits: (t.traits as any[]).sort((a, b) => a.position - b.position),
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
```

- [ ] Create `app/q/[token]/wizard-client.tsx` (thin client wrapper with redirect on submit):
```tsx
'use client'
import { useState } from 'react'
import { Wizard } from '@/components/questionnaire/wizard'

export function WizardClient({ token, types, initialAnswers }: any) {
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">¡Listo!</h2>
          <p className="text-muted-foreground">Tu coach revisará tus resultados pronto.</p>
        </div>
      </div>
    )
  }

  return <Wizard token={token} types={types} initialAnswers={initialAnswers} onSubmitted={() => setSubmitted(true)} />
}
```

- [ ] Commit:
```bash
git add components/questionnaire/ app/q/ && git commit -m "feat: add questionnaire wizard with auto-save and submit gate"
```

---

## Phase 3 — Coach Admin

### Task 9: Auth + login page

**Files:** `app/admin/login/page.tsx`, `app/admin/layout.tsx`

- [ ] Create `app/admin/login/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/admin')
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>Acceso coach</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] Create `app/admin/layout.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return <>{children}</>
}
```

- [ ] Commit:
```bash
git add app/admin/ && git commit -m "feat: add coach login and auth layout"
```

---

### Task 10: Dashboard + create client

**Files:** `app/admin/page.tsx`, `app/admin/clients/new/page.tsx`, `app/api/clients/route.ts`

- [ ] Create `app/api/clients/route.ts`:
```ts
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
  // Verify coach auth
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

  // Create empty submission
  await supabase.from('submissions').insert({ client_id: client.id, status: 'not_started' })

  return NextResponse.json({ client, token })
}
```

- [ ] Create `app/admin/clients/new/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewClientPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [generatedLink, setGeneratedLink] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email: email || undefined, internalNotes: notes || undefined }),
    })
    const data = await res.json()
    if (data.token) {
      setGeneratedLink(`${window.location.origin}/q/${data.token}`)
    }
    setLoading(false)
  }

  if (generatedLink) {
    return (
      <div className="max-w-lg mx-auto p-8 space-y-4">
        <h1 className="text-xl font-semibold">Cliente creado</h1>
        <p className="text-sm text-muted-foreground">Copia este enlace y envíalo al cliente:</p>
        <div className="flex gap-2">
          <Input value={generatedLink} readOnly className="font-mono text-sm" />
          <Button onClick={() => navigator.clipboard.writeText(generatedLink)}>Copiar</Button>
        </div>
        <Button variant="outline" onClick={() => window.location.href = '/admin'}>Volver al panel</Button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-8">
      <Card>
        <CardHeader><CardTitle>Nuevo cliente</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Email (opcional)</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Notas internas (no visibles al cliente)</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear y generar enlace'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] Create `app/admin/page.tsx` (client list dashboard):
```tsx
import { createServiceClient } from '@/lib/supabase/service'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Sin iniciar',
  in_progress: 'En progreso',
  submitted: 'Enviado',
  reviewing: 'En revisión',
  released: 'Publicado',
}

const STATUS_VARIANTS: Record<string, 'default'|'secondary'|'outline'|'destructive'> = {
  not_started: 'outline',
  in_progress: 'secondary',
  submitted: 'default',
  reviewing: 'secondary',
  released: 'default',
}

export default async function AdminDashboard() {
  const supabase = createServiceClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, email, created_at, submissions(status)')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Panel de coach</h1>
        <div className="flex gap-2">
          <Link href="/admin/settings"><Button variant="outline">Ajustes</Button></Link>
          <Link href="/admin/clients/new"><Button>+ Nuevo cliente</Button></Link>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-2">Nombre</th>
            <th className="text-left py-2">Email</th>
            <th className="text-left py-2">Estado</th>
            <th className="text-left py-2">Fecha</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {(clients ?? []).map(client => {
            const status = client.submissions?.[0]?.status ?? 'not_started'
            return (
              <tr key={client.id} className="border-b hover:bg-muted/50">
                <td className="py-3">{client.name}</td>
                <td className="py-3 text-muted-foreground">{client.email ?? '—'}</td>
                <td className="py-3">
                  <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
                </td>
                <td className="py-3 text-muted-foreground">
                  {new Date(client.created_at).toLocaleDateString('es')}
                </td>
                <td className="py-3">
                  <Link href={`/admin/clients/${client.id}`}>
                    <Button size="sm" variant="ghost">Ver →</Button>
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] Commit:
```bash
git add app/admin/ app/api/clients/ && git commit -m "feat: add dashboard, create client flow"
```

---

### Task 11: Review screen

**Files:** `app/admin/clients/[id]/page.tsx`, `components/admin/answer-grid.tsx`, `components/admin/results-sidebar.tsx`, `components/admin/cartilla-editor.tsx`, `app/api/release/[id]/route.ts`

- [ ] Create `app/api/release/[id]/route.ts`:
```ts
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('submissions')
    .update({ status: 'released', released_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] Create `app/api/coach-answer/route.ts` (coach edits a single answer):
```ts
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  submissionId: z.string().uuid(),
  traitId: z.string().uuid(),
  stage: z.enum(['ninez','adolescencia','juventud','vejez']),
  value: z.enum(['si','no']).nullable(),
})

export async function POST(req: Request) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const { submissionId, traitId, stage, value } = parsed.data
  const supabase = createServiceClient()

  // Fetch existing to preserve original_value
  const { data: existing } = await supabase
    .from('answers')
    .select('original_value')
    .eq('submission_id', submissionId)
    .eq('trait_id', traitId)
    .eq('stage', stage)
    .single()

  await supabase.from('answers').upsert({
    submission_id: submissionId,
    trait_id: traitId,
    stage,
    value,
    original_value: existing?.original_value ?? null,
    is_coach_edit: true,
  }, { onConflict: 'submission_id,trait_id,stage' })

  return NextResponse.json({ ok: true })
}
```

- [ ] Create `app/api/coach-note/route.ts`:
```ts
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({ submissionId: z.string().uuid(), note: z.string() })

export async function POST(req: Request) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const supabase = createServiceClient()
  await supabase.from('submissions').update({ coach_note: parsed.data.note }).eq('id', parsed.data.submissionId)
  return NextResponse.json({ ok: true })
}
```

- [ ] Create `app/api/cartilla/route.ts` (save per-client cartilla):
```ts
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  submissionId: z.string().uuid(),
  cartilla: z.record(z.string()),
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
```

- [ ] Create `app/admin/clients/[id]/page.tsx` (server component, loads data):
```tsx
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

  const submission = client.submissions?.[0]

  const { data: typeRows } = await supabase
    .from('personality_types')
    .select('id, slug, name, cluster, default_cartilla, traits(id, position, text)')
    .order('id')

  const types = (typeRows ?? []).map(t => ({
    ...t,
    traits: (t.traits as any[]).sort((a, b) => a.position - b.position),
  }))

  const { data: answerRows } = submission ? await supabase
    .from('answers')
    .select('trait_id, stage, value, original_value, is_coach_edit')
    .eq('submission_id', submission.id) : { data: [] }

  return (
    <ReviewClient
      client={client}
      submission={submission ?? null}
      types={types}
      answerRows={answerRows ?? []}
    />
  )
}
```

- [ ] Create `app/admin/clients/[id]/review-client.tsx` (large client component — orchestrates state):
```tsx
'use client'
import { useState, useCallback, useRef, useMemo } from 'react'
import { computeResult } from '@/lib/heptagrama/calc'
import type { AnswersMap, Stage, TypeSlug } from '@/lib/heptagrama/types'
import { AnswerGrid } from '@/components/admin/answer-grid'
import { ResultsSidebar } from '@/components/admin/results-sidebar'
import { CartillaEditor } from '@/components/admin/cartilla-editor'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface Props {
  client: any
  submission: any
  types: any[]
  answerRows: any[]
}

export function ReviewClient({ client, submission, types, answerRows }: Props) {
  // Build traitIdsByType for calc engine
  const traitIdsByType = useMemo(() => {
    const map: Record<TypeSlug, string[]> = {} as any
    for (const t of types) map[t.slug as TypeSlug] = t.traits.map((tr: any) => tr.id)
    return map
  }, [types])

  // Initialize answers map
  const [answers, setAnswers] = useState<AnswersMap>(() => {
    const map: AnswersMap = {}
    for (const row of answerRows) {
      if (!map[row.trait_id]) map[row.trait_id] = { ninez: null, adolescencia: null, juventud: null, vejez: null }
      map[row.trait_id][row.stage as Stage] = row.value ?? null
    }
    return map
  })

  // Track coach edits vs original
  const [coachEdits, setCoachEdits] = useState<Set<string>>(() =>
    new Set(answerRows.filter(r => r.is_coach_edit).map(r => `${r.trait_id}:${r.stage}`))
  )
  const [originals, setOriginals] = useState<Record<string, string | null>>(() => {
    const map: Record<string, string | null> = {}
    for (const row of answerRows) map[`${row.trait_id}:${row.stage}`] = row.original_value ?? null
    return map
  })

  const [coachNote, setCoachNote] = useState(submission?.coach_note ?? '')
  const [cartilla, setCartilla] = useState<Record<string, string>>(submission?.cartilla_override ?? {})
  const [saving, setSaving] = useState(false)
  const [released, setReleased] = useState(submission?.status === 'released')
  const noteDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const result = useMemo(() => computeResult(answers, traitIdsByType), [answers, traitIdsByType])

  const handleAnswerChange = useCallback(async (traitId: string, stage: Stage, value: import('@/lib/heptagrama/types').Answer) => {
    setAnswers(prev => ({
      ...prev,
      [traitId]: { ...(prev[traitId] ?? { ninez: null, adolescencia: null, juventud: null, vejez: null }), [stage]: value }
    }))
    setCoachEdits(prev => { const s = new Set(prev); s.add(`${traitId}:${stage}`); return s })

    if (submission) {
      await fetch('/api/coach-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id, traitId, stage, value }),
      })
    }
  }, [submission])

  const handleReset = useCallback(async (traitId: string, stage: Stage) => {
    const key = `${traitId}:${stage}`
    const orig = originals[key] as import('@/lib/heptagrama/types').Answer
    setAnswers(prev => ({
      ...prev,
      [traitId]: { ...(prev[traitId] ?? { ninez: null, adolescencia: null, juventud: null, vejez: null }), [stage]: orig }
    }))
    setCoachEdits(prev => { const s = new Set(prev); s.delete(key); return s })
    if (submission) {
      await fetch('/api/coach-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id, traitId, stage, value: orig }),
      })
    }
  }, [originals, submission])

  const handleNoteChange = (note: string) => {
    setCoachNote(note)
    if (noteDebounce.current) clearTimeout(noteDebounce.current)
    noteDebounce.current = setTimeout(() => {
      if (submission) fetch('/api/coach-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id, note }),
      })
    }, 800)
  }

  const handleCartillaChange = async (updated: Record<string, string>) => {
    setCartilla(updated)
    if (submission) {
      await fetch('/api/cartilla', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id, cartilla: updated }),
      })
    }
  }

  const handleRelease = async () => {
    if (!submission) return
    setSaving(true)
    const res = await fetch(`/api/release/${submission.id}`, { method: 'POST' })
    if (res.ok) setReleased(true)
    setSaving(false)
  }

  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-3 flex items-center gap-4">
        <Link href="/admin" className="text-sm text-muted-foreground hover:underline">← Panel</Link>
        <h1 className="font-semibold">{client.name}</h1>
        {client.email && <span className="text-sm text-muted-foreground">{client.email}</span>}
        {released && <Badge>Publicado</Badge>}
      </header>

      <div className="flex">
        {/* Left scroll area */}
        <div className="flex-1 p-6 space-y-8 overflow-y-auto">
          {types.map(type => (
            <AnswerGrid
              key={type.id}
              typeName={type.name}
              traits={type.traits}
              answers={answers}
              coachEdits={coachEdits}
              onAnswerChange={handleAnswerChange}
              onReset={handleReset}
            />
          ))}

          <div className="space-y-2">
            <h3 className="font-medium">Nota personal del coach</h3>
            <Textarea
              value={coachNote}
              onChange={e => handleNoteChange(e.target.value)}
              rows={6}
              placeholder="Escribe tu nota personal para el cliente..."
            />
          </div>

          <CartillaEditor
            cartilla={cartilla}
            onChange={handleCartillaChange}
          />

          {!released && submission?.status !== 'not_started' && (
            <div className="border-t pt-4">
              <Button onClick={handleRelease} disabled={saving}>
                {saving ? 'Publicando...' : 'Publicar resultados al cliente'}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                El cliente podrá descargar su PDF una vez publicado.
              </p>
            </div>
          )}
        </div>

        {/* Right sticky sidebar */}
        <div className="w-80 border-l sticky top-0 h-screen overflow-y-auto p-4">
          <ResultsSidebar result={result} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] Create `components/admin/answer-grid.tsx`:
```tsx
import type { Answer, Stage } from '@/lib/heptagrama/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const STAGES: { key: Stage; label: string }[] = [
  { key: 'ninez', label: 'Niñez' },
  { key: 'adolescencia', label: 'Adolescencia' },
  { key: 'juventud', label: 'Juventud' },
  { key: 'vejez', label: 'Vejez' },
]

interface Props {
  typeName: string
  traits: { id: string; text: string }[]
  answers: Record<string, Record<Stage, Answer>>
  coachEdits: Set<string>
  onAnswerChange: (traitId: string, stage: Stage, value: Answer) => void
  onReset: (traitId: string, stage: Stage) => void
}

export function AnswerGrid({ typeName, traits, answers, coachEdits, onAnswerChange, onReset }: Props) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-lg">{typeName}</h3>
      {traits.map(trait => (
        <div key={trait.id} className="grid grid-cols-[1fr_repeat(4,90px)] gap-2 items-center py-1 border-b text-sm">
          <span>{trait.text}</span>
          {STAGES.map(({ key, label }) => {
            const val = answers[trait.id]?.[key] ?? null
            const isEdited = coachEdits.has(`${trait.id}:${key}`)
            return (
              <div key={key} className="flex flex-col items-center gap-0.5">
                <span className="text-xs text-muted-foreground">{label}</span>
                <div className="flex gap-1 items-center">
                  <Button
                    size="sm" variant={val === 'si' ? 'default' : 'outline'}
                    className="h-6 px-2 text-xs"
                    onClick={() => onAnswerChange(trait.id, key, val === 'si' ? null : 'si')}
                  >Sí</Button>
                  <Button
                    size="sm" variant={val === 'no' ? 'destructive' : 'outline'}
                    className="h-6 px-2 text-xs"
                    onClick={() => onAnswerChange(trait.id, key, val === 'no' ? null : 'no')}
                  >No</Button>
                  {isEdited && (
                    <button onClick={() => onReset(trait.id, key)} title="Restaurar original" className="text-xs text-yellow-600 ml-1">↺</button>
                  )}
                </div>
                {isEdited && <Badge variant="outline" className="text-[10px] h-4">editado</Badge>}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
```

- [ ] Create `components/admin/results-sidebar.tsx`:
```tsx
import type { FullResult, TypeSlug } from '@/lib/heptagrama/types'

const TYPE_NAMES: Record<TypeSlug, string> = {
  solitario: 'Solitario', sensitivo: 'Sensitivo', agudo: 'Agudo',
  estructurado: 'Estructurado', energetico: 'Energético',
  expansivo: 'Expansivo', carismatico: 'Carismático',
}

const CLUSTER_LABELS: Record<string, string> = {
  emocional: 'Emocional', motriz: 'Motriz', racional: 'Racional', universal: 'Universal'
}

export function ResultsSidebar({ result }: { result: FullResult }) {
  const { canonical } = result

  return (
    <div className="space-y-4 text-sm">
      <h3 className="font-semibold">Resultados (Juventud)</h3>

      {canonical.dominant ? (
        <>
          <div>
            <p className="text-muted-foreground text-xs">Tipo dominante</p>
            <p className="font-bold text-lg">{TYPE_NAMES[canonical.dominant]}</p>
          </div>
          {canonical.second && (
            <div>
              <p className="text-muted-foreground text-xs">Top dos</p>
              <p>{TYPE_NAMES[canonical.dominant]} {((canonical.ratio1 ?? 0) * 100).toFixed(0)}% — {TYPE_NAMES[canonical.second]} {((canonical.ratio2 ?? 0) * 100).toFixed(0)}%</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground text-xs">Índice de carisma</p>
            <p>{canonical.carismaIndex?.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Énfasis genético</p>
            <p>{canonical.enfasis ? CLUSTER_LABELS[canonical.enfasis] : '—'}</p>
          </div>
        </>
      ) : (
        <p className="text-muted-foreground">Sin respuestas en Juventud</p>
      )}

      <hr />
      <h3 className="font-semibold">Todos los stages</h3>
      {(['ninez','adolescencia','juventud','vejez'] as const).map(stage => {
        const s = result.stages[stage]
        return (
          <div key={stage} className="space-y-1">
            <p className="font-medium capitalize">{stage === 'ninez' ? 'Niñez' : stage.charAt(0).toUpperCase() + stage.slice(1)}</p>
            {Object.entries(s.normalized)
              .sort(([,a],[,b]) => b - a)
              .map(([slug, val]) => (
                <div key={slug} className="flex justify-between">
                  <span className="text-muted-foreground">{TYPE_NAMES[slug as TypeSlug]}</span>
                  <span>{(val * 100).toFixed(1)}%</span>
                </div>
              ))}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] Create `components/admin/cartilla-editor.tsx`:
```tsx
'use client'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const CARTILLA_FIELDS: { key: string; label: string; multiline?: boolean }[] = [
  { key: 'polaridad', label: 'Polaridad' },
  { key: 'glandulaMaestra', label: 'Glándula maestra' },
  { key: 'glandulaSubsidiaria', label: 'Glándula subsidiaria' },
  { key: 'enfasisGenetico', label: 'Énfasis genético' },
  { key: 'dictum', label: 'Dictum de autoafirmación' },
  { key: 'anhelo', label: 'Anhelo de plenitud' },
  { key: 'pecadoCapital', label: 'Pecado capital' },
  { key: 'virtud', label: 'Virtud' },
  { key: 'susceptibilidad', label: 'Susceptibilidad' },
  { key: 'rasgoDominante', label: 'Rasgo dominante' },
  { key: 'trabajoARealizar', label: 'Trabajo a realizar', multiline: true },
]

interface Props {
  cartilla: Record<string, string>
  onChange: (updated: Record<string, string>) => void
}

export function CartillaEditor({ cartilla, onChange }: Props) {
  const update = (key: string, value: string) => onChange({ ...cartilla, [key]: value })

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Cartilla Fundamental</h3>
      {CARTILLA_FIELDS.map(({ key, label, multiline }) => (
        <div key={key} className="space-y-1">
          <Label>{label}</Label>
          {multiline ? (
            <Textarea value={cartilla[key] ?? ''} onChange={e => update(key, e.target.value)} rows={3} />
          ) : (
            <Input value={cartilla[key] ?? ''} onChange={e => update(key, e.target.value)} />
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] Commit:
```bash
git add app/admin/clients/ app/api/ components/admin/ && git commit -m "feat: add review screen with live recalc, cartilla editor, release button"
```

---

### Task 12: Settings page

**Files:** `app/admin/settings/page.tsx`, `app/api/settings/route.ts`

- [ ] Create `app/api/settings/route.ts`:
```ts
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
```

- [ ] Create `app/admin/settings/page.tsx`:
```tsx
import { createServiceClient } from '@/lib/supabase/service'
import { SettingsClient } from './settings-client'

export default async function SettingsPage() {
  const supabase = createServiceClient()
  const [{ data: settings }, { data: coach }] = await Promise.all([
    supabase.from('settings').select('auto_release').single(),
    supabase.from('coach').select('name, logo_url').single(),
  ])

  return <SettingsClient settings={settings} coach={coach} />
}
```

- [ ] Create `app/admin/settings/settings-client.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function SettingsClient({ settings, coach }: any) {
  const [autoRelease, setAutoRelease] = useState(settings?.auto_release ?? false)
  const [coachName, setCoachName] = useState(coach?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auto_release: autoRelease, coach_name: coachName }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-lg mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold">Ajustes</h1>

      <Card>
        <CardHeader><CardTitle>Publicación automática</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-3">
            <Switch checked={autoRelease} onCheckedChange={setAutoRelease} />
            <Label>Publicar resultados automáticamente al recibir el cuestionario</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Por defecto OFF — el coach revisa manualmente cada envío antes de publicar.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Información del coach</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Nombre del coach</Label>
            <Input value={coachName} onChange={e => setCoachName(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar cambios'}
      </Button>
    </div>
  )
}
```

- [ ] Commit:
```bash
git add app/admin/settings/ app/api/settings/ && git commit -m "feat: add settings page"
```

---

## Phase 4 — PDF

### Task 13: PDF component + route

**Files:** `lib/pdf/results-note.tsx`, `app/r/[token]/pdf/route.ts`

- [ ] Create `lib/pdf/results-note.tsx`:
```tsx
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 11, padding: 48, color: '#1a1a1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, borderBottom: '1 solid #e5e7eb', paddingBottom: 16 },
  logo: { width: 60, height: 60, objectFit: 'contain' },
  coachName: { fontSize: 10, color: '#6b7280', marginTop: 4 },
  h1: { fontSize: 20, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  h2: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginTop: 20, marginBottom: 8 },
  label: { fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 12, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 32, marginBottom: 8 },
  col: { flex: 1 },
  section: { marginBottom: 16 },
  cartillaRow: { flexDirection: 'row', marginBottom: 4, gap: 8 },
  cartillaLabel: { fontSize: 9, color: '#6b7280', width: 140 },
  cartillaValue: { fontSize: 10, flex: 1 },
  table: { marginTop: 8 },
  tableRow: { flexDirection: 'row', borderBottom: '1 solid #f3f4f6', paddingVertical: 3 },
  tableHeader: { flexDirection: 'row', borderBottom: '1 solid #d1d5db', paddingVertical: 4, marginBottom: 2 },
  tableCell: { flex: 1, fontSize: 9 },
  note: { fontSize: 10, lineHeight: 1.6, color: '#374151', marginTop: 8, borderLeft: '2 solid #e5e7eb', paddingLeft: 12 },
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48, borderTop: '1 solid #e5e7eb', paddingTop: 8, fontSize: 8, color: '#9ca3af', flexDirection: 'row', justifyContent: 'space-between' },
})

const TYPE_NAMES: Record<string, string> = {
  solitario: 'Solitario', sensitivo: 'Sensitivo', agudo: 'Agudo',
  estructurado: 'Estructurado', energetico: 'Energético',
  expansivo: 'Expansivo', carismatico: 'Carismático',
}
const STAGE_LABELS: Record<string, string> = {
  ninez: 'Niñez', adolescencia: 'Adolescencia', juventud: 'Juventud', vejez: 'Vejez'
}
const CARTILLA_LABELS: Record<string, string> = {
  polaridad: 'Polaridad', glandulaMaestra: 'Glándula maestra',
  glandulaSubsidiaria: 'Glándula subsidiaria', enfasisGenetico: 'Énfasis genético',
  dictum: 'Dictum de autoafirmación', anhelo: 'Anhelo de plenitud',
  pecadoCapital: 'Pecado capital', virtud: 'Virtud',
  susceptibilidad: 'Susceptibilidad', rasgoDominante: 'Rasgo dominante',
  trabajoARealizar: 'Trabajo a realizar',
}

interface Props {
  clientName: string
  date: string
  coachName: string
  logoUrl?: string
  result: any
  cartilla: Record<string, string>
  coachNote: string
}

export function ResultsNote({ clientName, date, coachName, logoUrl, result, cartilla, coachNote }: Props) {
  const { canonical, stages } = result
  const dominant = canonical.dominant
  const typeNames = Object.keys(stages.adolescencia?.normalized ?? {})

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            {logoUrl && <Image src={logoUrl} style={s.logo} />}
            <Text style={s.coachName}>{coachName}</Text>
          </View>
          <View style={{ textAlign: 'right' }}>
            <Text style={s.label}>Nota de resultados</Text>
            <Text style={{ fontSize: 9, color: '#6b7280' }}>{date}</Text>
          </View>
        </View>

        {/* Client name */}
        <Text style={s.h1}>{clientName}</Text>

        {/* Dominant headline */}
        {dominant && (
          <View style={[s.section, s.row]}>
            <View style={s.col}>
              <Text style={s.label}>Tipo dominante</Text>
              <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold' }}>{TYPE_NAMES[dominant]}</Text>
            </View>
            <View style={s.col}>
              <Text style={s.label}>Top dos (Juventud)</Text>
              <Text style={s.value}>
                {TYPE_NAMES[canonical.dominant]} {((canonical.ratio1 ?? 0) * 100).toFixed(0)}% — {TYPE_NAMES[canonical.second]} {((canonical.ratio2 ?? 0) * 100).toFixed(0)}%
              </Text>
            </View>
            <View style={s.col}>
              <Text style={s.label}>Índice de carisma</Text>
              <Text style={s.value}>{canonical.carismaIndex?.toFixed(2)}</Text>
              <Text style={s.label}>Énfasis genético</Text>
              <Text style={s.value}>{canonical.enfasis}</Text>
            </View>
          </View>
        )}

        {/* 4-stage normalized scores table */}
        <Text style={s.h2}>Perfil por etapa de vida</Text>
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.tableCell, { fontFamily: 'Helvetica-Bold' }]}>Tipo</Text>
            {['ninez','adolescencia','juventud','vejez'].map(st => (
              <Text key={st} style={[s.tableCell, { fontFamily: 'Helvetica-Bold' }]}>{STAGE_LABELS[st]}</Text>
            ))}
          </View>
          {Object.keys(stages.juventud?.normalized ?? {}).map(slug => (
            <View key={slug} style={s.tableRow}>
              <Text style={s.tableCell}>{TYPE_NAMES[slug]}</Text>
              {(['ninez','adolescencia','juventud','vejez'] as const).map(st => (
                <Text key={st} style={s.tableCell}>
                  {stages[st]?.normalized[slug] != null
                    ? (stages[st].normalized[slug] * 100).toFixed(1) + '%'
                    : '—'}
                </Text>
              ))}
            </View>
          ))}
        </View>

        {/* Cartilla Fundamental */}
        <Text style={s.h2}>Cartilla Fundamental</Text>
        {Object.entries(CARTILLA_LABELS).map(([key, label]) => (
          cartilla[key] ? (
            <View key={key} style={s.cartillaRow}>
              <Text style={s.cartillaLabel}>{label}</Text>
              <Text style={s.cartillaValue}>{cartilla[key]}</Text>
            </View>
          ) : null
        ))}

        {/* Coach note */}
        {coachNote && (
          <>
            <Text style={s.h2}>Nota del coach</Text>
            <Text style={s.note}>{coachNote}</Text>
          </>
        )}

        {/* Footer */}
        <View style={s.footer}>
          <Text>{coachName}</Text>
          <Text>Heptagrama — Semiología</Text>
        </View>
      </Page>
    </Document>
  )
}
```

- [ ] Create `app/r/[token]/pdf/route.ts`:
```ts
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { ResultsNote } from '@/lib/pdf/results-note'
import { computeResult } from '@/lib/heptagrama/calc'
import type { AnswersMap, Stage, TypeSlug } from '@/lib/heptagrama/types'
import React from 'react'

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('name, submissions(id, status, coach_note, cartilla_override)')
    .eq('token', token)
    .single()

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const submission = client.submissions?.[0]
  if (!submission || submission.status !== 'released') {
    return NextResponse.json({ error: 'Not released' }, { status: 403 })
  }

  // Load answers
  const { data: answerRows } = await supabase
    .from('answers')
    .select('trait_id, stage, value')
    .eq('submission_id', submission.id)

  const { data: typeRows } = await supabase
    .from('personality_types')
    .select('id, slug, traits(id)')

  // Build traitIdsByType
  const traitIdsByType: Record<TypeSlug, string[]> = {} as any
  for (const t of typeRows ?? []) {
    traitIdsByType[t.slug as TypeSlug] = (t.traits as any[]).map(tr => tr.id)
  }

  // Build answers map
  const answers: AnswersMap = {}
  for (const row of answerRows ?? []) {
    if (!answers[row.trait_id]) answers[row.trait_id] = { ninez: null, adolescencia: null, juventud: null, vejez: null }
    answers[row.trait_id][row.stage as Stage] = row.value ?? null
  }

  const result = computeResult(answers, traitIdsByType)

  // Load coach info
  const { data: coach } = await supabase.from('coach').select('name, logo_url').single()

  const pdfBuffer = await renderToBuffer(
    React.createElement(ResultsNote, {
      clientName: client.name,
      date: new Date().toLocaleDateString('es'),
      coachName: coach?.name ?? '',
      logoUrl: coach?.logo_url ?? undefined,
      result,
      cartilla: submission.cartilla_override ?? {},
      coachNote: submission.coach_note ?? '',
    })
  )

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="resultados-${client.name.replace(/\s+/g, '-')}.pdf"`,
    },
  })
}
```

- [ ] Commit:
```bash
git add lib/pdf/ app/r/ && git commit -m "feat: add PDF results note generation"
```

---

### Task 14: First boot setup + final wiring

**Files:** `app/api/setup/route.ts`, `app/page.tsx`

- [ ] Create `app/api/setup/route.ts` (one-time coach account creation — disable after use):
```ts
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

// One-time setup endpoint. Disable by removing this file after first use.
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
```

- [ ] Update `app/page.tsx` to redirect to admin:
```tsx
import { redirect } from 'next/navigation'
export default function Home() { redirect('/admin') }
```

- [ ] Commit:
```bash
git add app/page.tsx app/api/setup/ && git commit -m "feat: add root redirect and first-boot setup endpoint"
```

---

### Task 15: Smoke test end-to-end

- [ ] Start dev server:
```bash
npm run dev
```

- [ ] Apply migration in Supabase dashboard SQL editor (paste `supabase/migrations/001_initial.sql`).

- [ ] Run seed:
```bash
node scripts/seed-db.mjs
```

- [ ] Create coach account via `POST /api/setup` (use curl or Postman):
```bash
curl -X POST http://localhost:3000/api/setup \
  -H "Content-Type: application/json" \
  -d '{"email":"coach@example.com","password":"changeme","name":"Mi Coach"}'
```

- [ ] Test golden path:
  1. Visit `/admin/login` → log in
  2. Create new client → copy link
  3. Open link in incognito → complete questionnaire (fill all Juventud)
  4. Submit → see confirmation
  5. In admin → open client → verify answers load, sidebar shows results
  6. Edit one answer → verify sidebar recalculates live
  7. Fill coach note → edit Cartilla
  8. Release → visit client link → PDF download button appears
  9. Download PDF → verify all sections present

- [ ] Fix any runtime errors found.

- [ ] Commit:
```bash
git add -A && git commit -m "chore: smoke test fixes"
```

---

## Done

All 4 phases complete. The app:
- Collects assessments via token-gated links
- Auto-saves answers, enforces Juventud completion before submit
- Coach reviews with live recalculation, edits answers (with reset to original), edits Cartilla, writes note
- Releases triggers PDF download for client
- PDF contains all spec-required sections
