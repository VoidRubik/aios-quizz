import { createServiceClient } from '@/lib/supabase/service'
import { SettingsClient } from './settings-client'

export default async function SettingsPage() {
  const supabase = createServiceClient()
  const [{ data: settings }, { data: coach }] = await Promise.all([
    supabase.from('settings').select('auto_release').single(),
    supabase.from('coach').select('name, logo_url').single(),
  ])

  return <SettingsClient settings={settings} coach={coach} />
}
