import { createServiceClient } from '@/lib/supabase/service'
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

export default async function AdminDashboard() {
  const supabase = createServiceClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, email, created_at, submissions(status)')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Panel de coach</h1>
        <div className="flex gap-2">
          <Link href="/admin/settings"><Button variant="outline">Ajustes</Button></Link>
          <Link href="/admin/clients/new"><Button>+ Nuevo cliente</Button></Link>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-2">Nombre</th>
            <th className="text-left py-2">Email</th>
            <th className="text-left py-2">Estado</th>
            <th className="text-left py-2">Fecha</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {(clients ?? []).map((client: any) => {
            const status = (client.submissions as any[])?.[0]?.status ?? 'not_started'
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
