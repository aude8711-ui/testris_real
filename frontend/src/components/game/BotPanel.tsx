'use client'
import { useEffect, useRef, useCallback, useState } from 'react'
import { GameEngine } from '@/lib/tetris/engine'
import { useBot } from '@/lib/workers/useBot'
import { GameBoard } from './GameBoard'

const GRAVITY_MS = 800
const BOT_THINK_MS = 100

interface Props {
  cellSize: number
  running: boolean
  label: string
  onTopOut: () => void
}

export function BotPanel({ cellSize, running, label, onTopOut }: Props) {
  const [tick, setTick] = useState(0)
  const engineRef = useRef<GameEngine | null>(null)
  const notifiedRef = useRef(false)
  const botActionsRef = useRef<string[]>([])
  const onTopOutRef = useRef(onTopOut)
  onTopOutRef.current = onTopOut

  const refresh = useCallback(() => setTick(t => t + 1), [])

  const { initBot, addPiece, requestMove } = useBot({
    onMove: (actions: string[], _hold: boolean) => { botActionsRef.current = actions },
  })

  // Initialize engine and bot on mount
  useEffect(() => {
    const eng = new GameEngine(Date.now() + Math.random() * 100000)
    engineRef.current = eng
    notifiedRef.current = false
    botActionsRef.current = []
    refresh()
    const { active, next } = eng.state
    if (active) {
      initBot(active.type, next)
      // Don't call addPiece here — initBot already sets currentPiece for JS bot;
      // calling addPiece(next[4]) would corrupt it to the wrong piece
      setTimeout(() => requestMove(), 50) // allow worker to process init before requesting first move
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps — init once on mount, intentional

  // Gravity loop
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const eng = engineRef.current
      if (!eng || eng.state.topOut) return
      const prevType = eng.state.active?.type
      eng.tick()
      if (eng.state.active?.type !== prevType) {
        botActionsRef.current = [] // piece locked, discard stale actions for old piece
      }
      if (eng.state.topOut && !notifiedRef.current) {
        notifiedRef.current = true
        onTopOutRef.current()
      }
      refresh()
    }, GRAVITY_MS)
    return () => clearInterval(id)
  }, [running, refresh])

  // Bot move application loop
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const eng = engineRef.current
      if (!eng || eng.state.topOut || botActionsRef.current.length === 0) return
      const action = botActionsRef.current.shift()!
      applyAction(eng, action)
      if (botActionsRef.current.length === 0) {
        const { active, next } = eng.state
        if (active) {
          addPiece(active.type) // sync JS bot's currentPiece to actual active piece
          requestMove(eng.state.board)
        }
      }
      refresh()
    }, BOT_THINK_MS)
    return () => clearInterval(id)
  }, [running, refresh, addPiece, requestMove])

  const eng = engineRef.current
  if (!eng) return null

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-xs text-white/60">{label}</div>
      <div className="relative">
        <GameBoard state={eng.state} ghostRow={eng.getGhostRow()} cellSize={cellSize} />
        {eng.state.topOut && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <span className="text-red-400 font-bold text-sm">GAME OVER</span>
          </div>
        )}
      </div>
      <div className="text-xs text-white/40">Lines: {eng.state.linesCleared}</div>
    </div>
  )
}

function applyAction(eng: GameEngine, action: string) {
  switch (action) {
    case 'move_left':  eng.move('left'); break
    case 'move_right': eng.move('right'); break
    case 'soft_drop':  eng.softDrop(); break
    case 'hard_drop':  eng.hardDrop(); break
    case 'rotate_cw':  eng.rotate(1); break
    case 'rotate_ccw': eng.rotate(-1); break
    case 'rotate_180': eng.rotate(2); break
    case 'hold':       eng.hold(); break
    default: break
  }
}
