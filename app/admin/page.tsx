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
    <div className="admin-shell">
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <span className="admin-eyebrow">Heptagrama</span>
            <h1 className="admin-title">Panel de coach</h1>
          </div>
          <div className="admin-actions">
            <Link href="/admin/settings"><Button variant="outline">Ajustes</Button></Link>
            <Link href="/admin/clients/new"><Button>+ Nuevo cliente</Button></Link>
          </div>
        </div>
        <ClientsTable clients={(clients ?? []) as any} />
      </div>
    </div>
  )
}
