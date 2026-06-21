'use client'

export interface Floater {
  id: number
  side: string
  value: number
  createdAt: number
}

const FLOATER_LIFETIME_MS = 900

export function pruneFloaters(floaters: Floater[], now: number): Floater[] {
  return floaters.filter(f => now - f.createdAt < FLOATER_LIFETIME_MS)
}

// Renders the floating "+N" labels for a single side. Caller owns the
// floater list (pushed from the real calculateAttack() result) and prunes
// expired entries via pruneFloaters() on each render tick.
export function AttackFloaters({ floaters, side }: { floaters: Floater[]; side: string }) {
  const mine = floaters.filter(f => f.side === side)
  if (mine.length === 0) return null
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {mine.map(f => (
        <div
          key={f.id}
          className="absolute top-1/3 left-1/2 text-red-400 font-bold text-lg drop-shadow"
          style={{ animation: `debug-float-up ${FLOATER_LIFETIME_MS}ms ease-out forwards` }}
        >
          +{f.value}
        </div>
      ))}
    </div>
  )
}
