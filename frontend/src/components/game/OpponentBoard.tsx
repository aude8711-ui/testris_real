'use client'
import { useEffect, useRef } from 'react'
import type { PieceType } from '@/lib/tetris/pieces'
import { PIECE_COLORS } from '@/lib/tetris/pieces'

interface Props {
  board: (PieceType | null)[][]
  nickname: string
}

const MINI = 8
const COLS = 10
const ROWS = 20

export function OpponentBoard({ board, nickname }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#0d0d0f'
    ctx.fillRect(0, 0, COLS * MINI, ROWS * MINI)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = board[r][c]
        if (cell) {
          ctx.fillStyle = PIECE_COLORS[cell]
          ctx.fillRect(c * MINI + 1, (ROWS - 1 - r) * MINI + 1, MINI - 2, MINI - 2)
        }
      }
    }
  }, [board])

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-xs text-white/60 truncate max-w-[80px]">{nickname}</div>
      <canvas ref={canvasRef} width={COLS * MINI} height={ROWS * MINI} className="border border-white/10" />
    </div>
  )
}
