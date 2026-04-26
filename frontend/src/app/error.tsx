'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold text-red-400">Something went wrong</h1>
      <p className="text-white/40 text-sm">{error.message}</p>
      <button onClick={reset} className="text-indigo-400 underline text-sm">Try again</button>
    </main>
  )
}
