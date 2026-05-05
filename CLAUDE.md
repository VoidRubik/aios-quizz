# Heptagrama — Project Notes

## What this is
Web app for psychological coaching practice. Replaces an Excel-based assessment tool (`Heptagrama RA v1.1.xlsx`) with a database-backed app for collecting client questionnaires and generating coach-reviewed result PDFs.

## Domain model

### 7 personality types (with trait counts)
| Type | Traits | Énfasis Genético |
|------|--------|------------------|
| Solitario | 23 | Racional |
| Sensitivo | 22 | Emocional |
| Agudo | 23 | Emocional |
| Estructurado | 23 | Racional |
| Energético | 23 | Motriz |
| Expansivo | 20 | Motriz |
| Carismático | 28 | Universal |

### 4 life stages (per trait)
Niñez · Adolescencia · Juventud · Vejez · answer = Sí / No

### Calculation pipeline (per stage, independently)
1. `raw[type] = count(Sí) / total_traits[type]`
2. `norm[type] = raw[type] / Σ(all 7 raws for that stage)`
3. Top two types by norm
4. `ratio1 = norm1 / (norm1 + norm2)` · `ratio2 = norm2 / (norm1 + norm2)`
5. `carisma_index = (1 - ratio1) * 2`
6. Énfasis Genético = cluster of dominant type

### Canonical stage
**Juventud** is the canonical stage. Cartilla Fundamental + dominant-type fields in PDF derive from Juventud's results. Other 3 stages still computed and shown in PDF chart/table.

## Cartilla Fundamental
Per dominant type, fixed descriptive attributes:
Polaridad · Glándula maestra · Glándula subsidiaria · Énfasis genético · Dictum de autoafirmación · Anhelo de plenitud · Pecado capital · Virtud · Susceptibilidad · Rasgo dominante · Trabajo a realizar.

App ships default template per type (only Agudo populated initially — coach fills others over time). On submission, app auto-fills dominant type's template into client's record. Coach can edit any field per-client during review.

## Two-part assessment
1. **Automatic** — math runs on submission
2. **Coach review (mandatory gate)** — coach edits any answer, edits Cartilla, writes personal note, manually releases. Auto-release is OFF by default and globally.

## Source of truth
`Heptagrama RA v1.1.xlsx` — original Excel. All trait text and calc logic verified against it.

## Current state
- Git repo initialized
- Excel file in repo
- Next.js 15 scaffold in progress

## Conventions
- Spanish content (traits, UI labels client-facing). Code/comments in English.
- All trait text stored verbatim from Excel.
