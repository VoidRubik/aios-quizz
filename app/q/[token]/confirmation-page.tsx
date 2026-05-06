export function ConfirmationPage({ clientName }: { clientName: string }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-card" style={{ textAlign: 'center' }}>
        <div className="welcome-header">
          <span className="welcome-logo">Heptagrama</span>
        </div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', margin: '0 0 0.5rem', color: 'var(--color-muted)', fontWeight: 300 }}>—</p>
        <h1 className="welcome-title">Gracias, {clientName}</h1>
        <p className="welcome-subtitle">
          Tu coach revisará tus respuestas y te enviará tu Cartilla Fundamental por correo electrónico cuando esté lista.
        </p>
      </div>
    </div>
  )
}
