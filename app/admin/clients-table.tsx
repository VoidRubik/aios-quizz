'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Sin iniciar',
  in_progress: 'En progreso',
  submitted: 'Enviado',
  reviewing: 'En revisión',
  released: 'Publicado',
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  not_started: 'status-badge status-badge--outline',
  in_progress: 'status-badge status-badge--in-progress',
  submitted: 'status-badge status-badge--default',
  reviewing: 'status-badge status-badge--in-progress',
  released: 'status-badge status-badge--released',
}

interface Client {
  id: string
  name: string
  email: string | null
  created_at: string
  token: string
  submissions: { status: string }[]
}

export function ClientsTable({ clients }: { clients: Client[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyLink = async (client: Client) => {
    const url = `${window.location.origin}/q/${client.token}`
    await navigator.clipboard.writeText(url)
    setCopiedId(client.id)
    toast('Enlace copiado al portapapeles')
    setTimeout(() => setCopiedId(prev => prev === client.id ? null : prev), 3000)
  }

  return (
    <div className="clients-table-wrap">
      <table className="clients-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Estado</th>
            <th>Fecha</th>
            <th>Enlace</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {clients.map(client => {
            const status = client.submissions?.[0]?.status ?? 'not_started'
            const copied = copiedId === client.id
            return (
              <tr key={client.id}>
                <td>{client.name}</td>
                <td className="muted">{client.email ?? '—'}</td>
                <td>
                  <span className={STATUS_BADGE_CLASS[status]}>
                    {STATUS_LABELS[status]}
                  </span>
                </td>
                <td className="muted">
                  {new Date(client.created_at).toLocaleDateString('es')}
                </td>
                <td>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyLink(client)}
                  >
                    {copied ? '✓ Copiado' : 'Copiar enlace'}
                  </Button>
                </td>
                <td>
                  <Link href={`/admin/clients/${client.id}`}>
                    <Button size="sm" variant="ghost">Ver →</Button>
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
