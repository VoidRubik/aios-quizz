import { createServiceClient } from '@/lib/supabase/service'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ClientsTable } from './clients-table'

export default async function AdminDashboard() {
  const supabase = createServiceClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, email, created_at, token, submissions(status)')
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
      <ClientsTable clients={(clients ?? []) as any} />
    </div>
  )
}
