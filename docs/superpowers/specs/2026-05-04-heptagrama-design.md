# Heptagrama — Design Spec

**Date:** 2026-05-04
**Status:** Draft for review

## 1. Purpose

Replace the manual Excel-based Heptagrama assessment with a web app. Coach creates client profiles, sends private questionnaire links, reviews submissions with editable answers + computed results, and releases a PDF "Results Note" to each client.

## 2. Domain reference

### 7 personality types (from `Heptagrama RA v1.1.xlsx`)
| Type | Traits | Énfasis Genético cluster |
|------|--------|--------------------------|
| Solitario | 23 | Racional |
| Sensitivo | 22 | Emocional |
| Agudo | 23 | Emocional |
| Estructurado | 23 | Racional |
| Energético | 23 | Motriz |
| Expansivo | 20 | Motriz |
| Carismático | 28 | Universal |

Total = 162 traits.

### 4 life stages
Niñez · Adolescencia · Juventud · Vejez. Each trait answered Sí / No / null per stage.

### Calculation pipeline (per stage, independently)
1. `raw[type] = count(Sí answers for that type's traits in that stage) / total_traits[type]`
2. `norm[type] = raw[type] / Σ(raw[t] for all 7 types in that stage)`
3. Top two types by `norm` → `type1`, `type2`
4. `ratio1 = norm[type1] / (norm[type1] + norm[type2])`
   `ratio2 = norm[type2] / (norm[type1] + norm[type2])`
5. `carisma_index = (1 - ratio1) * 2`
6. Énfasis Genético = cluster of `type1`

### Canonical stage
**Juventud** drives the Cartilla Fundamental and the headline result fields. Other 3 stages still computed and displayed in the PDF chart/table. If Juventud has no answers, headline values are unavailable (empty state).

### Cartilla Fundamental
Fixed descriptive set per dominant type:
Polaridad · Glándula maestra · Glándula subsidiaria · Énfasis genético · Dictum de autoafirmación · Anhelo de plenitud · Pecado capital · Virtud · Susceptibilidad · Rasgo dominante · Trabajo a realizar.

App ships default templates per type; only Agudo is populated initially. Coach fills others over time. On submission, the dominant type's template is copied into the submission as `cartilla_override` (jsonb). Coach edits per-client during review without affecting global default.

## 3. Tech stack

- **Next.js 15** (App Router) + TypeScript
- **Supabase** — Postgres, Auth (coach), Storage (logo)
- **Vercel** deploy
- **Tailwind CSS + shadcn/ui** — UI primitives
- **@react-pdf/renderer** — server-rendered PDF
- **Recharts** — 4-stage normalized chart
- **Zod** — validation
- **TanStack Query** — coach admin state

## 4. Data model

```sql
coach              (id pk, email, name, logo_url)              -- single row, owner
settings           (id pk = 1, auto_release bool default false) -- single row
personality_types  (id pk, slug unique, name, cluster enum, default_cartilla jsonb)
traits             (id pk, type_id fk, position int, text)
clients            (id pk, name, email nullable, token unique, internal_notes text, created_at)
submissions        (id pk, client_id fk unique, status enum, submitted_at, released_at, coach_note text, cartilla_override jsonb)
answers            (submission_id fk, trait_id fk, stage enum,
                    value enum[si|no] nullable,          -- current value (coach may override)
                    original_value enum[si|no] nullable, -- immutable client answer; set once on submit, never touched again
                    is_coach_edit bool default false,
                    PRIMARY KEY (submission_id, trait_id, stage))
```

`status` enum: `not_started | in_progress | submitted | reviewing | released`.
`stage` enum: `ninez | adolescencia | juventud | vejez`.
`cluster` enum: `emocional | motriz | racional | universal`.

One submission per client (retakes = create new client). `personality_types` + `traits` seeded from Excel via migration.

## 5. Routes

| Path | Audience | Purpose |
|------|----------|---------|
| `/` | public | Redirect to admin login |
| `/admin/login` | coach | Email/password login |
| `/admin` | coach | Dashboard: client list, search, filter, status |
| `/admin/clients/new` | coach | Create profile → generate token → show copyable link |
| `/admin/clients/[id]` | coach | Review submission, edit answers, edit Cartilla, write note, release |
| `/admin/settings` | coach | Auto-release toggle, coach name, logo upload |
| `/q/[token]` | client | Questionnaire (resumes if in progress; "pending review" if submitted; "download" if released) |
| `/r/[token]/pdf` | client | Stream PDF download (only if status = released) |

## 6. Calc engine

Pure module `lib/heptagrama/calc.ts`. Pure functions, no I/O.

```ts
type Stage = 'ninez' | 'adolescencia' | 'juventud' | 'vejez';
type TypeSlug = 'solitario' | 'sensitivo' | 'agudo' | 'estructurado' | 'energetico' | 'expansivo' | 'carismatico';
type Answer = 'si' | 'no' | null;

interface AnswersMap { [traitId: string]: { [stage in Stage]: Answer } }

interface StageResult {
  raw: Record<TypeSlug, number>;
  normalized: Record<TypeSlug, number>;
  dominant: TypeSlug | null;          // null if no answers in stage
  second: TypeSlug | null;
  ratio1: number | null;
  ratio2: number | null;
  carismaIndex: number | null;
  enfasis: 'emocional'|'motriz'|'racional'|'universal' | null;
}

interface FullResult {
  stages: Record<Stage, StageResult>;
  canonical: StageResult;             // = stages.juventud
}

function computeResult(answers: AnswersMap, traitsByType: Record<TypeSlug, string[]>): FullResult;
```

Used both server-side (initial submit, persist nothing computed — recompute on demand) and client-side (live recalc as coach toggles in admin).

**Edge cases:**
- Stage with all-null answers → all raws = 0, normalized division by zero → return all nulls for that stage's dominant/ratios/carisma.
- Tie at top two → pick by `personality_types.id` order (stable, deterministic).

## 7. Coach review screen `/admin/clients/[id]`

Layout: two-column.

**Left (scroll):**
- Client header: name, email, status, submitted_at, released_at.
- 7 collapsible sections (one per type). Each section shows traits as rows × 4 stage toggle buttons.
- Toggle states: Sí · No · — (null). Coach-edited cells visually badged.
- "Reset answer to client original" button per cell that's been coach-edited.
- Cartilla section (collapsible): each field editable inline. "Reset to type default" per field.
- Coach note: textarea (markdown-light).

**Right (sticky):**
- Dominant type, top-two ratio bar, carisma gauge, énfasis genético — all pulled from canonical (Juventud) stage.
- Mini 4-stage normalized chart.
- Recalcs live as left-side toggles flip (TanStack Query optimistic mutation + recompute via calc engine in browser).

**Bottom bar:**
- "Release to client" button. Confirmation modal. Sets `status = released`, `released_at = now()`. Idempotent.

## 8. Client questionnaire `/q/[token]`

- Step-per-type wizard: intro → 7 type steps → review → submit.
- Each step: list of traits for that type, 4 stage toggle buttons per trait.
- Auto-save: debounced (500 ms) upsert per `(token, trait_id, stage)`. Status becomes `in_progress` on first answer, `submitted` on submit.
- **Submit gate:** "Enviar" button disabled until all Juventud-stage answers are filled (Sí or No). No null Juventud answers allowed at submission. This guarantees `canonical.dominant` is never null post-submit.
- Resume: re-opening token URL hydrates from saved answers.
- After submit: lock all toggles, show "Tu coach revisará tus resultados."
- After release: same URL reveals "Descargar resultados (PDF)" button → `/r/[token]/pdf`.

## 9. PDF

`/r/[token]/pdf` renders server-side with `@react-pdf/renderer`.

Sections (in order):
1. Header: coach logo + coach name. Date.
2. Client name.
3. Dominant type headline (Juventud).
4. Top two ratio bar (e.g. "Agudo 56% — Estructurado 44%").
5. Énfasis Genético badge.
6. Carisma Index value.
7. 4-stage normalized scores table (or chart rasterized).
8. Cartilla Fundamental: all 11 fields from `cartilla_override`.
9. Coach personal note.
10. Footer: small disclaimer + coach contact.

Style: clean minimal, neutral palette, system serif body. Iterate post-MVP for branding polish.

## 10. Auth & security

- Coach: Supabase Auth email/password. Single coach account (env-pinned email allowed; sign-up disabled).
- Client: token-only access. Tokens are 32-char URL-safe random (`crypto.randomBytes(24).toString('base64url')`). Stored unique-indexed.
- All client-facing routes (`/q`, `/r`) accept token via path param; server-side handler looks up client + submission, validates state.
- RLS:
  - `coach` table — readable only by authenticated coach.
  - `clients`, `submissions`, `answers`, `settings`, `personality_types`, `traits` — full access for authenticated coach role only.
  - Public/anon access — none. All client-facing reads/writes go through Next.js route handlers using a server-side service role key + token validation.
- Logo upload — Supabase Storage, public bucket, only coach can write.
- Rate-limit token endpoints (Vercel edge middleware or simple in-memory token bucket per IP) to deter token enumeration.

## 11. Settings

- `auto_release` global boolean. Default false. When true, submissions move directly to `released` on submit and skip the coach review gate. Spec mandates default-off and coach must explicitly opt in.
- Coach name and logo URL.

## 12. Migrations & seed

- Single migration creates schema.
- Seed script reads `Heptagrama RA v1.1.xlsx` once at build time (or via a Node script run locally) and emits a SQL/TS seed that inserts:
  - 7 `personality_types` rows (with default_cartilla = empty object, except Agudo populated from Excel).
  - 162 `traits` rows.
- Settings row + coach row created on first boot via env-driven setup (or one-shot admin-init route).

## 13. Out of scope (MVP)

- Email notifications to client on release.
- Retake support beyond "create new client".
- Multi-coach.
- I18n / non-Spanish content.
- Mobile-native app.
- Audit log / answer history beyond current state.

## 14. Open questions left

None blocking. Polish items (PDF branding, post-MVP retake UX) tracked separately.
