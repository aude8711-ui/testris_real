import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PlayPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8">
      <h1 className="text-3xl font-bold text-white">Choose Mode</h1>
      <div className="flex gap-4">
        <ModeCard href="/game"           title="vs AI"       desc="Practice against ColdClear bot" />
        <ModeCard href="/room?ranked=true" title="Ranked"    desc="Compete and climb the ladder" badge="Pro" />
        <ModeCard href="/room"           title="Custom Room" desc="Play with friends" />
      </div>
      <div className="flex gap-6 mt-4 text-sm text-white/40">
        <Link href={`/profile/${(session.user as any).id}`} className="hover:text-white">Profile</Link>
        <Link href="/settings" className="hover:text-white">Settings</Link>
        <Link href="/pricing"  className="hover:text-white">Pricing</Link>
      </div>
    </main>
  )
}

function ModeCard({ href, title, desc, badge }: { href: string; title: string; desc: string; badge?: string }) {
  return (
    <Link href={href} className="block w-48 p-5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-semibold text-white">{title}</span>
        {badge && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 rounded">{badge}</span>}
      </div>
      <p className="text-xs text-white/40">{desc}</p>
    </Link>
  )
}
