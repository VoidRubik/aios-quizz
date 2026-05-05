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
