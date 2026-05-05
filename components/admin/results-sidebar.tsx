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
