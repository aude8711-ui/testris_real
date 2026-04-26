'use client'
import { useEffect, useRef } from 'react'
import { PIECE_COLORS, PIECES } from '@/lib/tetris/pieces'
import type { GameState } from '@/lib/tetris/engine'

const CELL = 32
const COLS = 10
const ROWS = 20

interface Props {
  state: GameState
  ghostRow: number
}

export function GameBoard({ state, ghostRow }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = '#0d0d0f'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1a1a2e'
    ctx.lineWidth = 0.5
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.strokeRect(c * CELL, (ROWS - 1 - r) * CELL, CELL, CELL)
      }
    }

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = state.board[r][c]
        if (cell) {
          drawMino(ctx, c, ROWS - 1 - r, PIECE_COLORS[cell])
        }
      }
    }

    if (state.active) {
      const minos = PIECES[state.active.type][state.active.rotation]
      ctx.globalAlpha = 0.25
      for (const [dr, dc] of minos) {
        drawMino(ctx, state.active.col + dc, ROWS - 1 - (ghostRow + dr), PIECE_COLORS[state.active.type])
      }
      ctx.globalAlpha = 1

      for (const [dr, dc] of minos) {
        drawMino(ctx, state.active.col + dc, ROWS - 1 - (state.active.row + dr), PIECE_COLORS[state.active.type])
      }
    }
  }, [state, ghostRow])

  return (
    <canvas
      ref={canvasRef}
      width={COLS * CELL}
      height={ROWS * CELL}
      className="border border-white/10"
    />
  )
}

function drawMino(ctx: CanvasRenderingContext2D, col: number, row: number, color: string) {
  const x = col * CELL
  const y = row * CELL
  ctx.fillStyle = color
  ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2)
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.fillRect(x + 1, y + 1, CELL - 2, 4)
}
