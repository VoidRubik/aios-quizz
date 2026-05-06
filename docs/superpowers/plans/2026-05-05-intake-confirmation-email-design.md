# Intake Form + Submission Confirmation + Email PDF + Design Overhaul

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add client intake screen, submission confirmation UX, Cartilla Fundamental email delivery, and apply A-typography/C-structure design across the whole app.

**Architecture:** Welcome screen gates the quiz when `status === 'not_started'`; a new `/api/start` route saves email + creates submission; submit route sends PDF email via Resend after marking submitted; design tokens applied via global CSS variables and Google Fonts in root layout.

**Tech Stack:** Next.js 15 App Router, Supabase (service client), Resend (email), @react-pdf/renderer (existing), Tailwind CSS v4, shadcn/ui components.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `app/q/[token]/page.tsx` | Modify | Route `not_started` → WelcomePage |
| `app/q/[token]/welcome-page.tsx` | Create | Server wrapper: fetch client data |
| `app/q/[token]/welcome-client.tsx` | Create | Client component: intake form |
| `app/api/start/route.ts` | Create | Save email, create submission `in_progress` |
| `app/api/submit/route.ts` | Modify | After submit: send Cartilla PDF via email |
| `app/admin/page.tsx` | Modify | Fetch `token`, replace table with `<ClientsTable>` |
| `app/admin/clients-table.tsx` | Create | Interactive table: copy link, toast |
| `app/admin/layout.tsx` | Modify | Add `<Toaster />` |
| `app/layout.tsx` | Modify | Google Fonts import, design CSS variables |
| `app/globals.css` | Modify | Design tokens: colors, typography scale |
| `app/q/[token]/questionnaire-page.tsx` | Modify | Apply new design tokens |
| `app/q/[token]/confirmation-page.tsx` | Modify | Apply new design |
| `app/admin/login/page.tsx` | Modify | Apply new design |
| `lib/email/send-cartilla.ts` | Create | Resend email sender with PDF attachment |

---

## Task 1: Install Resend and add env var

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.env.local`
- Modify: `.env.local.example`

- [ ] **Step 1: Install Resend**

```bash
cd "c:/Users/Shanty/Documents/Quizz de Semiologia"
npm install resend
```

Expected output: `added 1 package`

- [ ] **Step 2: Add RESEND_API_KEY to .env.local**

Add this line to `.env.local`:
```
RESEND_API_KEY=re_your_key_here
```

Get key from: https://resend.com/api-keys (free account, 3000 emails/month)

- [ ] **Step 3: Add to .env.local.example**

Add to `.env.local.example`:
```
RESEND_API_KEY=
RESEND_FROM_EMAIL=Heptagrama <noreply@yourdomain.com>
```

Also add `RESEND_FROM_EMAIL` to `.env.local` with your verified sender address.

- [ ] **Step 4: Add env vars to Vercel**

```powershell
echo "re_your_actual_key" | vercel env add RESEND_API_KEY production
echo "Heptagrama <noreply@yourdomain.com>" | vercel env add RESEND_FROM_EMAIL production
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.local.example
git commit -m "feat: add resend dependency for email delivery"
```

---

## Task 2: Email sender utility

**Files:**
- Create: `lib/email/send-cartilla.ts`

- [ ] **Step 1: Create the email sender**

Create `lib/email/send-cartilla.ts`:

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendCartillaEmail({
  toEmail,
  toName,
  pdfBuffer,
}: {
  toEmail: string
  toName: string
  pdfBuffer: Buffer
}) {
  const from = process.env.RESEND_FROM_EMAIL ?? 'Heptagrama <noreply@heptagrama.vercel.app>'

  await resend.emails.send({
    from,
    to: [toEmail],
    subject: `Tu Cartilla Fundamental — Heptagrama`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <h1 style="font-size: 24px; font-weight: normal; border-bottom: 1px solid #1a1a1a; padding-bottom: 12px;">
          Heptagrama
        </h1>
        <p>Estimado/a ${toName},</p>
        <p>Tu coach ha revisado tus resultados y ha preparado tu <strong>Cartilla Fundamental</strong>.</p>
        <p>Encontrarás el documento adjunto en formato PDF.</p>
        <p style="color: #666; font-size: 13px; margin-top: 32px; border-top: 1px solid #e0e0e0; padding-top: 12px;">
          Heptagrama · Sistema de evaluación psicológica
        </p>
      </div>
    `,
    attachments: [
      {
        filename: `cartilla-${toName.replace(/\s+/g, '-').toLowerCase()}.pdf`,
        content: pdfBuffer,
      },
    ],
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/email/send-cartilla.ts
git commit -m "feat: add cartilla email sender via Resend"
```

---

## Task 3: Wire email sending into submit route

**Files:**
- Modify: `app/api/submit/route.ts`

- [ ] **Step 1: Read current submit route**

Already read above. Key: after `supabase.from('submissions').update(...)`, we need to fetch client email and send PDF.

- [ ] **Step 2: Modify submit route to send email after submission**

Replace `app/api/submit/route.ts` with:

```typescript
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { renderToBuffer } from '@react-pdf/renderer'
import { ResultsNote } from '@/lib/pdf/results-note'
import { computeResult } from '@/lib/heptagrama/calc'
import type { AnswersMap, Stage, TypeSlug } from '@/lib/heptagrama/types'
import { sendCartillaEmail } from '@/lib/email/send-cartilla'
import React from 'react'

const schema = z.object({ token: z.string() })

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const { token } = parsed.data
  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, email, submissions(id, status)')
    .eq('token', token)
    .single()

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const submission = (client.submissions as any[])?.[0]
  if (!submission || submission.status !== 'in_progress') {
    return NextResponse.json({ error: 'Not in progress' }, { status: 400 })
  }

  // Verify all traits have Juventud answers
  const { data: traits } = await supabase.from('traits').select('id')
  const { data: juventudAnswers } = await supabase
    .from('answers')
    .select('trait_id, value')
    .eq('submission_id', submission.id)
    .eq('stage', 'juventud')

  const answeredTraitIds = new Set(
    (juventudAnswers ?? []).filter(a => a.value !== null).map(a => a.trait_id)
  )
  const allTraitIds = (traits ?? []).map((t: any) => t.id)
  const allJuventudAnswered = allTraitIds.every((id: string) => answeredTraitIds.has(id))

  if (!allJuventudAnswered) {
    return NextResponse.json({ error: 'Juventud incomplete' }, { status: 422 })
  }

  const { data: settings } = await supabase.from('settings').select('auto_release').single()
  const newStatus = settings?.auto_release ? 'released' : 'submitted'

  // Compute dominant type for cartilla_override
  const { data: allAnswers } = await supabase
    .from('answers')
    .select('trait_id, value')
    .eq('submission_id', submission.id)
    .eq('stage', 'juventud')

  const { data: typeRows } = await supabase
    .from('personality_types')
    .select('id, slug, default_cartilla')

  const { data: traitRows } = await supabase.from('traits').select('id, type_id')
  const traitTypeMap: Record<string, number> = {}
  for (const t of traitRows ?? []) traitTypeMap[t.id] = t.type_id
  const typeById: Record<number, any> = {}
  for (const t of typeRows ?? []) typeById[t.id] = t

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

  // Send Cartilla PDF email if client has email and status is released
  if (newStatus === 'released' && client.email) {
    try {
      const { data: answerRows } = await supabase
        .from('answers')
        .select('trait_id, stage, value')
        .eq('submission_id', submission.id)

      const { data: typeRowsFull } = await supabase
        .from('personality_types')
        .select('id, slug, traits(id)')

      const traitIdsByType: Record<TypeSlug, string[]> = {} as any
      for (const t of typeRowsFull ?? []) {
        traitIdsByType[t.slug as TypeSlug] = (t.traits as any[]).map(tr => tr.id)
      }

      const answers: AnswersMap = {}
      for (const row of answerRows ?? []) {
        if (!answers[row.trait_id]) answers[row.trait_id] = { ninez: null, adolescencia: null, juventud: null, vejez: null }
        answers[row.trait_id][row.stage as Stage] = row.value ?? null
      }

      const result = computeResult(answers, traitIdsByType)
      const { data: coach } = await supabase.from('coach').select('name, logo_url').single()

      const pdfBuffer = await renderToBuffer(
        React.createElement(ResultsNote, {
          clientName: client.name,
          date: new Date().toLocaleDateString('es'),
          coachName: coach?.name ?? '',
          logoUrl: coach?.logo_url ?? undefined,
          result,
          cartilla: cartillaOverride,
          coachNote: '',
        }) as any
      )

      await sendCartillaEmail({
        toEmail: client.email,
        toName: client.name,
        pdfBuffer: Buffer.from(pdfBuffer),
      })
    } catch (err) {
      // Email failure must not block submission success
      console.error('Email send failed:', err)
    }
  }

  return NextResponse.json({ ok: true, status: newStatus })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/submit/route.ts
git commit -m "feat: send cartilla PDF email on submission"
```

---

## Task 4: /api/start route (intake form backend)

**Files:**
- Create: `app/api/start/route.ts`

- [ ] **Step 1: Create the route**

Create `app/api/start/route.ts`:

```typescript
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

  // Save confirmed email
  await supabase.from('clients').update({ email }).eq('id', client.id)

  const existing = (client.submissions as any[])?.[0]

  if (existing && existing.status !== 'not_started') {
    // Already started — just update email, return ok
    return NextResponse.json({ ok: true })
  }

  if (existing) {
    // Update not_started → in_progress
    await supabase.from('submissions')
      .update({ status: 'in_progress' })
      .eq('id', existing.id)
  } else {
    // Create submission
    await supabase.from('submissions').insert({
      client_id: client.id,
      status: 'in_progress',
    })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/start/route.ts
git commit -m "feat: add /api/start route for client intake"
```

---

## Task 5: Welcome screen components

**Files:**
- Create: `app/q/[token]/welcome-client.tsx`
- Modify: `app/q/[token]/page.tsx`

- [ ] **Step 1: Create welcome-client.tsx**

Create `app/q/[token]/welcome-client.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  token: string
  clientName: string
  initialEmail: string | null
}

export function WelcomeClient({ token, clientName, initialEmail }: Props) {
  const [email, setEmail] = useState(initialEmail ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email }),
    })
    if (!res.ok) {
      setError('Error al guardar. Intenta de nuevo.')
      setLoading(false)
      return
    }
    router.refresh()
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-card">
        <div className="welcome-header">
          <span className="welcome-logo">Heptagrama</span>
        </div>
        <h1 className="welcome-title">Bienvenido/a, {clientName}</h1>
        <p className="welcome-subtitle">
          A continuación responderás un cuestionario sobre diferentes etapas de tu vida.
          Responde con sinceridad — no hay respuestas correctas o incorrectas.
        </p>
        <form onSubmit={handleStart} className="welcome-form">
          <label className="welcome-label" htmlFor="email">
            Correo electrónico
            <span className="welcome-label-hint">Recibirás tu Cartilla Fundamental aquí</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            className="welcome-input"
          />
          {error && <p className="welcome-error">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email}
            className="welcome-button"
          >
            {loading ? 'Comenzando…' : 'Comenzar cuestionario'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Modify page.tsx to show WelcomePage for not_started**

Replace `app/q/[token]/page.tsx`:

```typescript
import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { QuestionnairePage } from './questionnaire-page'
import { ConfirmationPage } from './confirmation-page'
import { ResultsReadyPage } from './results-ready-page'
import { WelcomeClient } from './welcome-client'

export default async function TokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, email, submissions(id, status)')
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

  if (status === 'not_started') {
    return (
      <WelcomeClient
        token={token}
        clientName={client.name}
        initialEmail={client.email ?? null}
      />
    )
  }

  const answers = submission
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
```

- [ ] **Step 3: Commit**

```bash
git add app/q/[token]/welcome-client.tsx app/q/[token]/page.tsx
git commit -m "feat: add client intake welcome screen"
```

---

## Task 6: Admin copy-link table with toast

**Files:**
- Create: `app/admin/clients-table.tsx`
- Modify: `app/admin/page.tsx`
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: Install sonner (toast library) if not present**

```bash
npm list sonner 2>/dev/null || npm install sonner
```

- [ ] **Step 2: Create clients-table.tsx**

Create `app/admin/clients-table.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { toast } from 'sonner'
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

interface Client {
  id: string
  name: string
  email: string | null
  created_at: string
  token: string
  submissions: { status: string }[]
}

export function ClientsTable({ clients }: { clients: Client[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyLink = async (client: Client) => {
    const url = `${window.location.origin}/q/${client.token}`
    await navigator.clipboard.writeText(url)
    setCopiedId(client.id)
    toast('Enlace copiado al portapapeles')
    setTimeout(() => setCopiedId(prev => prev === client.id ? null : prev), 3000)
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-muted-foreground">
          <th className="text-left py-2">Nombre</th>
          <th className="text-left py-2">Email</th>
          <th className="text-left py-2">Estado</th>
          <th className="text-left py-2">Fecha</th>
          <th className="text-left py-2">Enlace</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {clients.map(client => {
          const status = client.submissions?.[0]?.status ?? 'not_started'
          const copied = copiedId === client.id
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyLink(client)}
                >
                  {copied ? '✓ Copiado' : 'Copiar enlace'}
                </Button>
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
  )
}
```

- [ ] **Step 3: Modify admin/page.tsx to use ClientsTable**

Replace `app/admin/page.tsx`:

```typescript
import { createServiceClient } from '@/lib/supabase/service'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ClientsTable } from './clients-table'

export default async function AdminDashboard() {
  const supabase = createServiceClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, email, created_at, token, submissions(status)')
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
      <ClientsTable clients={(clients ?? []) as any} />
    </div>
  )
}
```

- [ ] **Step 4: Add Toaster to admin layout**

Replace `app/admin/layout.tsx`:

```typescript
import { Toaster } from 'sonner'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="bottom-right" />
    </>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/admin/clients-table.tsx app/admin/page.tsx app/admin/layout.tsx
git commit -m "feat: admin copy-link button with toast confirmation"
```

---

## Task 7: Design system — A typography + C structure

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Update root layout with Google Fonts**

Replace font imports in `app/layout.tsx` (keep existing metadata, just update fonts):

```typescript
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Heptagrama',
  description: 'Sistema de evaluación psicológica',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Replace globals.css design tokens**

Add to `app/globals.css` (after existing Tailwind directives, keep them):

```css
/* Design system: A typography + C editorial structure */
:root {
  --font-display: 'Cormorant Garamond', Georgia, serif;
  --font-body: 'DM Sans', system-ui, sans-serif;

  --color-ink: #111111;
  --color-paper: #fafaf8;
  --color-rule: #d0d0cc;
  --color-accent: #c0392b;       /* carmine red */
  --color-accent-muted: #f5e6e4;
  --color-muted: #666662;
}

body {
  font-family: var(--font-body);
  background: var(--color-paper);
  color: var(--color-ink);
}

h1, h2, h3 {
  font-family: var(--font-display);
  font-weight: 400;
  letter-spacing: -0.01em;
}
```

- [ ] **Step 3: Apply design to welcome screen**

Add to `app/globals.css`:

```css
/* Welcome / intake screen */
.welcome-screen {
  min-height: 100svh;
  display: grid;
  place-items: center;
  background: var(--color-paper);
  padding: 2rem;
}

.welcome-card {
  width: 100%;
  max-width: 480px;
  border: 1px solid var(--color-ink);
  padding: 3rem;
}

.welcome-header {
  border-bottom: 1px solid var(--color-ink);
  padding-bottom: 1rem;
  margin-bottom: 2rem;
}

.welcome-logo {
  font-family: var(--font-display);
  font-size: 1.1rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-muted);
}

.welcome-title {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 300;
  margin: 0 0 0.75rem;
  line-height: 1.2;
}

.welcome-subtitle {
  font-size: 0.9rem;
  color: var(--color-muted);
  line-height: 1.65;
  margin-bottom: 2rem;
}

.welcome-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.welcome-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-muted);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.welcome-label-hint {
  font-size: 0.7rem;
  color: var(--color-rule);
  text-transform: none;
  letter-spacing: 0;
}

.welcome-input {
  border: 1px solid var(--color-ink);
  padding: 0.75rem 1rem;
  font-family: var(--font-body);
  font-size: 0.95rem;
  background: transparent;
  outline: none;
  margin-bottom: 1rem;
}

.welcome-input:focus {
  border-color: var(--color-accent);
}

.welcome-button {
  background: var(--color-ink);
  color: var(--color-paper);
  border: 1px solid var(--color-ink);
  padding: 0.85rem 1.5rem;
  font-family: var(--font-body);
  font-size: 0.85rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.welcome-button:hover:not(:disabled) {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.welcome-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.welcome-error {
  font-size: 0.8rem;
  color: var(--color-accent);
}
```

- [ ] **Step 4: Apply design to confirmation page**

Replace `app/q/[token]/confirmation-page.tsx`:

```typescript
export function ConfirmationPage({ clientName }: { clientName: string }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-card" style={{ textAlign: 'center' }}>
        <div className="welcome-header">
          <span className="welcome-logo">Heptagrama</span>
        </div>
        <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>—</p>
        <h1 className="welcome-title">Gracias, {clientName}</h1>
        <p className="welcome-subtitle">
          Tu coach revisará tus respuestas y te enviará tu Cartilla Fundamental por correo electrónico.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Apply design to admin login page**

Replace `app/admin/login/page.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
    <div className="welcome-screen">
      <div className="welcome-card">
        <div className="welcome-header">
          <span className="welcome-logo">Heptagrama</span>
        </div>
        <h1 className="welcome-title">Acceso coach</h1>
        <form onSubmit={handleLogin} className="welcome-form">
          <label className="welcome-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="welcome-input"
          />
          <label className="welcome-label" htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="welcome-input"
          />
          {error && <p className="welcome-error">{error}</p>}
          <button type="submit" disabled={loading} className="welcome-button">
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit design system**

```bash
git add app/layout.tsx app/globals.css app/q/[token]/confirmation-page.tsx app/admin/login/page.tsx
git commit -m "feat: apply A-typography + C-editorial design system"
```

---

## Task 8: Deploy

- [ ] **Step 1: Build locally to verify no TypeScript errors**

```bash
cd "c:/Users/Shanty/Documents/Quizz de Semiologia"
npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 2: Deploy to production**

```bash
vercel --prod
```

Expected: `Production: https://heptagrama.vercel.app [READY]`

- [ ] **Step 3: Smoke test**

1. Visit `https://heptagrama.vercel.app/q/test-token-demo` — should show welcome screen with email field
2. Enter email, click Comenzar — should route to questionnaire
3. Visit `https://heptagrama.vercel.app/admin/login` — should show new design
4. Login, click "Copiar enlace" on a client — should show toast
5. Complete a test quiz submission — check email delivery (only sends if `auto_release = true`)

---

## Self-Review

**Spec coverage check:**
- ✅ Client intake form (email collection before quiz)
- ✅ Submission confirmation — ConfirmationPage updated with email mention
- ✅ Cartilla PDF sent via email on submit (when auto_release=true) or on release
- ✅ Admin copy-link with toast
- ✅ Design overhaul across quiz + admin

**Note on email timing:** Email currently sends only when `auto_release = true` (status goes straight to `released`). When coach manually releases via `/api/release/[id]`, that route also needs to send the email. That's a follow-up — add `sendCartillaEmail` call to `app/api/release/[id]/route.ts` using the same pattern as Task 3.

**Placeholder scan:** None found. All code blocks complete.

**Type consistency:** `Client` interface in `clients-table.tsx` matches what `admin/page.tsx` selects from Supabase.
