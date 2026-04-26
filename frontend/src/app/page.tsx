import Link from 'next/link'
import { auth } from '@/auth'

export default async function Home() {
  const session = await auth()
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-6xl font-black tracking-tight text-indigo-400">TESTRIS</h1>
      <p className="text-white/50 text-lg">Competitive browser Tetris. Play ranked, beat bots, climb the ladder.</p>
      {session ? (
        <Link href="/play" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-lg font-semibold">
          Play Now
        </Link>
      ) : (
        <Link href="/login" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-lg font-semibold">
          Sign In to Play
        </Link>
      )}
    </main>
  )
}
