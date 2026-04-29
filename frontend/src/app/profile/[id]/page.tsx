import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let profile: any
  try { profile = await api.getProfile(id) }
  catch { notFound() }

  return (
    <main className="min-h-screen p-8 max-w-lg mx-auto">
      <Link href="/play" className="inline-block mb-6 text-sm text-white/50 hover:text-white transition">← Back</Link>
      <h1 className="text-3xl font-bold mb-1">{profile.nickname ?? profile.guest_tag}</h1>
      <p className="text-white/40 text-sm mb-6">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
      <div className="grid grid-cols-3 gap-4 text-center">
        <Stat label="Tier" value={profile.tier ?? 'D'} />
        <Stat label="TR"   value={Math.round(profile.tr ?? 0).toString()} />
        <Stat label="W/L"  value={`${profile.wins ?? 0}/${profile.losses ?? 0}`} />
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-lg p-4">
      <div className="text-xs text-white/40 mb-1">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  )
}
