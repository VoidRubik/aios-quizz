import { Resend } from 'resend'

export async function sendCartillaEmail({
  toEmail,
  toName,
  pdfBuffer,
}: {
  toEmail: string
  toName: string
  pdfBuffer: Buffer
}) {
  const resend = new Resend(process.env.RESEND_API_KEY)
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
