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
    <div className="review-sidebar space-y-4 text-sm">
      <h3>Resultados (Juventud)</h3>

      {canonical.dominant ? (
        <>
          <div>
            <p className="review-eyebrow">Tipo dominante</p>
            <p className="review-dominant">{TYPE_NAMES[canonical.dominant]}</p>
          </div>
          {canonical.second && (
            <div>
              <p className="review-eyebrow">Top dos</p>
              <p>
                {TYPE_NAMES[canonical.dominant]}{' '}
                <span className="review-num">{((canonical.ratio1 ?? 0) * 100).toFixed(0)}%</span>
                {' — '}
                {TYPE_NAMES[canonical.second]}{' '}
                <span className="review-num">{((canonical.ratio2 ?? 0) * 100).toFixed(0)}%</span>
              </p>
            </div>
          )}
          <div>
            <p className="review-eyebrow">Índice de carisma</p>
            <p className="review-num">{canonical.carismaIndex?.toFixed(2)}</p>
          </div>
          <div>
            <p className="review-eyebrow">Énfasis genético</p>
            <p>{canonical.enfasis ? CLUSTER_LABELS[canonical.enfasis] : '—'}</p>
          </div>
        </>
      ) : (
        <p style={{ color: 'var(--color-muted)' }}>Sin respuestas en Juventud</p>
      )}

      <hr className="review-divider" />
      <h3>Todos los stages</h3>
      {(['ninez','adolescencia','juventud','vejez'] as const).map(stage => {
        const s = result.stages[stage]
        return (
          <div key={stage} className="space-y-1">
            <p className="review-eyebrow" style={{ marginTop: '0.5rem' }}>
              {stage === 'ninez' ? 'Niñez' : stage.charAt(0).toUpperCase() + stage.slice(1)}
            </p>
            {Object.entries(s.normalized)
              .sort(([,a],[,b]) => b - a)
              .map(([slug, val]) => {
                const pct = val * 100
                return (
                  <div key={slug} className="review-row">
                    <div className="review-row-label">
                      <span>{TYPE_NAMES[slug as TypeSlug]}</span>
                      <span className="review-bar" aria-hidden="true">
                        <span
                          className="review-bar-fill"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </span>
                    </div>
                    <span className="review-num">{pct.toFixed(1)}%</span>
                  </div>
                )
              })}
          </div>
        )
      })}
    </div>
  )
}
