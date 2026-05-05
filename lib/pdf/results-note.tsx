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

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            {logoUrl && <Image src={logoUrl} style={s.logo} />}
            <Text style={s.coachName}>{coachName}</Text>
          </View>
          <View>
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
                {TYPE_NAMES[canonical.dominant]} {((canonical.ratio1 ?? 0) * 100).toFixed(0)}% — {canonical.second ? TYPE_NAMES[canonical.second] : ''} {((canonical.ratio2 ?? 0) * 100).toFixed(0)}%
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
          {Object.keys(stages.juventud?.normalized ?? {}).map((slug: string) => (
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
        {coachNote ? (
          <>
            <Text style={s.h2}>Nota del coach</Text>
            <Text style={s.note}>{coachNote}</Text>
          </>
        ) : null}

        {/* Footer */}
        <View style={s.footer}>
          <Text>{coachName}</Text>
          <Text>Heptagrama — Semiología</Text>
        </View>
      </Page>
    </Document>
  )
}
