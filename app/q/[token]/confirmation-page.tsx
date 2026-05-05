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
