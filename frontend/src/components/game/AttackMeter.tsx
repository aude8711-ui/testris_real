'use client'

interface Props { lines: number; max?: number }

export function AttackMeter({ lines, max = 20 }: Props) {
  const pct = Math.min(lines / max, 1)
  return (
    <div className="flex flex-col items-center gap-1" style={{ height: 20 * 32 }}>
      <div className="text-xs text-white/40 uppercase tracking-widest">ATK</div>
      <div className="flex-1 w-3 bg-white/5 rounded overflow-hidden flex flex-col-reverse">
        <div
          className="w-full bg-red-500 transition-all duration-100"
          style={{ height: `${pct * 100}%` }}
        />
      </div>
      <div className="text-xs text-white/60">{lines}</div>
    </div>
  )
}
