# Heptagrama

A database-backed assessment app for a psychological-coaching practice — it replaces an Excel-based questionnaire tool with a token-linked client flow and coach-reviewed result PDFs.

![Heptagrama](docs/screenshots/heptagram.png)

## What it does

- **Coach admin panel** (`/admin`) — create clients, configure settings, review submitted questionnaires.
- **Client questionnaire** (`/q/[token]`) — a client opens a private token link and answers the trait inventory across four life stages (Niñez, Adolescencia, Juventud, Vejez), with auto-save per answer.
- **Scoring pipeline** — for each life stage independently: raw score per personality type (`Sí` count / trait total), normalized across the seven types, top-two types, a derived `carisma_index`, and an "Énfasis Genético" cluster.
- **Results** (`/r/[token]`) — coach-reviewed output, exportable as a generated PDF (`@react-pdf/renderer`).

### Domain model

Seven personality types (Solitario, Sensitivo, Agudo, Estructurado, Energético, Expansivo, Carismático), each with a trait inventory; four life stages per trait; `Sí` / `No` answers feeding the pipeline above.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Auth) · deployed on Vercel · `@react-pdf/renderer` for result documents.

## Run

```
npm install
npm run dev        # → http://localhost:3000
```

Needs a Supabase project — copy `.env.local.example` to `.env.local` and fill in the URL and keys. `npm run build` passes clean.

## Status

**Built** — full build passes, all routes compile, the scoring pipeline and client flow are implemented. The hosted Supabase backend has not been re-verified recently; run against your own project.
