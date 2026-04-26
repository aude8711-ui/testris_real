'use client'
import { PIECE_COLORS, PIECES, PieceType } from '@/lib/tetris/pieces'

interface Props { pieces: PieceType[] }

export function NextQueue({ pieces }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-white/40 uppercase tracking-widest">Next</div>
      {pieces.slice(0, 5).map((type, i) => (
        <MiniPiece key={i} type={type} />
      ))}
    </div>
  )
}

function MiniPiece({ type }: { type: PieceType }) {
  const minos = PIECES[type][0]
  const MINI = 14
  return (
    <div className="relative" style={{ width: 4 * MINI, height: 2 * MINI }}>
      {minos.map(([r, c], i) => (
        <div
          key={i}
          className="absolute"
          style={{
            width: MINI - 1,
            height: MINI - 1,
            background: PIECE_COLORS[type],
            left: c * MINI,
            top: (1 - r) * MINI,
          }}
        />
      ))}
    </div>
  )
}
