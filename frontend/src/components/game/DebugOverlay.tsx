'use client'

export interface SideStats {
  label: string
  sent: number
  received: number
  cancelled: number
  combo: number
  b2b: number
}

interface Props {
  sides: SideStats[]
}

// Diagnostic-only overlay — reads accumulated/live values the caller already
// derived from real GameEngine state and calculateAttack() results.
export function DebugOverlay({ sides }: Props) {
  return (
    <div className="fixed top-16 right-4 z-50 bg-black/85 border border-white/15 rounded-lg p-3 text-xs text-white/90 font-mono space-y-2 pointer-events-none">
      <div className="text-white/50 uppercase tracking-widest text-[10px]">Debug: Attack Flow</div>
      {sides.map(s => (
        <div key={s.label} className="space-y-0.5">
          <div className="text-white/70 font-semibold">{s.label}</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pl-2">
            <span className="text-white/40">Sent</span><span>{s.sent}</span>
            <span className="text-white/40">Received</span><span>{s.received}</span>
            <span className="text-white/40">Cancelled</span><span>{s.cancelled}</span>
            <span className="text-white/40">Combo</span><span>{s.combo}</span>
            <span className="text-white/40">B2B</span><span>{s.b2b}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
