import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const session = await auth()
  if (!(session?.user as any)?.is_admin) redirect('/play')

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
      <p className="text-white/40 text-sm">Use the API directly for admin actions.</p>
      <div className="mt-4 space-y-2 text-sm font-mono text-white/60">
        <div>POST /admin/users/:id/ban</div>
        <div>POST /admin/users/:id/unban</div>
        <div>POST /admin/system/maintenance</div>
      </div>
    </main>
  )
}
