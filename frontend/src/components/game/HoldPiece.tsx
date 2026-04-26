'use client'
import { PIECE_COLORS, PIECES, PieceType } from '@/lib/tetris/pieces'

interface Props { type: PieceType | null; used: boolean }

export function HoldPiece({ type, used }: Props) {
  const MINI = 14
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs text-white/40 uppercase tracking-widest">Hold</div>
      <div
        className="relative border border-white/10 p-1"
        style={{ width: 4 * MINI + 8, height: 2 * MINI + 8, opacity: used ? 0.4 : 1 }}
      >
        {type && PIECES[type][0].map(([r, c], i) => (
          <div
            key={i}
            className="absolute"
            style={{
              width: MINI - 1,
              height: MINI - 1,
              background: PIECE_COLORS[type],
              left: c * MINI + 4,
              top: (1 - r) * MINI + 4,
            }}
          />
        ))}
      </div>
    </div>
  )
}
