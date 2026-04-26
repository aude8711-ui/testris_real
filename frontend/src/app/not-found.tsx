import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-black text-white/20">404</h1>
      <Link href="/" className="text-indigo-400 underline text-sm">Back to Home</Link>
    </main>
  )
}
