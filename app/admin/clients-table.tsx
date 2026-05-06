'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Sin iniciar',
  in_progress: 'En progreso',
  submitted: 'Enviado',
  reviewing: 'En revisión',
  released: 'Publicado',
}

const STATUS_VARIANTS: Record<string, 'default'|'secondary'|'outline'|'destructive'> = {
  not_started: 'outline',
  in_progress: 'secondary',
  submitted: 'default',
  reviewing: 'secondary',
  released: 'default',
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
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-muted-foreground">
          <th className="text-left py-2">Nombre</th>
          <th className="text-left py-2">Email</th>
          <th className="text-left py-2">Estado</th>
          <th className="text-left py-2">Fecha</th>
          <th className="text-left py-2">Enlace</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {clients.map(client => {
          const status = client.submissions?.[0]?.status ?? 'not_started'
          const copied = copiedId === client.id
          return (
            <tr key={client.id} className="border-b hover:bg-muted/50">
              <td className="py-3">{client.name}</td>
              <td className="py-3 text-muted-foreground">{client.email ?? '—'}</td>
              <td className="py-3">
                <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
              </td>
              <td className="py-3 text-muted-foreground">
                {new Date(client.created_at).toLocaleDateString('es')}
              </td>
              <td className="py-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyLink(client)}
                >
                  {copied ? '✓ Copiado' : 'Copiar enlace'}
                </Button>
              </td>
              <td className="py-3">
                <Link href={`/admin/clients/${client.id}`}>
                  <Button size="sm" variant="ghost">Ver →</Button>
                </Link>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
