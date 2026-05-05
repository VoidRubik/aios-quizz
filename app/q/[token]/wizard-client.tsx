'use client'
import { useState } from 'react'
import { Wizard } from '@/components/questionnaire/wizard'

export function WizardClient({ token, types, initialAnswers }: { token: string; types: any[]; initialAnswers: any }) {
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
