'use client'
import { useEffect, useRef, useCallback, useState } from 'react'
import { GameEngine } from '@/lib/tetris/engine'
import { resolveAction, loadBindings } from '@/lib/tetris/keybindings'
import { GameBoard } from '@/components/game/GameBoard'
import { NextQueue } from '@/components/game/NextQueue'
import { HoldPiece } from '@/components/game/HoldPiece'
import { useBot } from '@/lib/workers/useBot'

const GRAVITY_MS = 800
const BOT_THINK_MS = 200

export default function GamePage() {
  const [tick, setTick] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const engineRef = useRef<GameEngine | null>(null)
  const bindings = useRef(loadBindings())
  const botActionsRef = useRef<string[]>([])

  const refresh = useCallback(() => setTick(t => t + 1), [])

  const { initBot, addPiece, requestMove } = useBot({
    onReady: () => requestMove(),
    onMove: (actions) => { botActionsRef.current = actions },
  })

  const startGame = useCallback(() => {
    const eng = new GameEngine(Date.now())
    engineRef.current = eng
    setGameOver(false)
    refresh()
    const { active, next } = eng.state
    if (active) {
      initBot(active.type, next)
      addPiece(next[next.length - 1])
    }
  }, [initBot, addPiece, refresh])

  useEffect(() => {
    const id = setInterval(() => {
      const eng = engineRef.current
      if (!eng || eng.state.topOut) return
      eng.tick()
      if (eng.state.topOut) setGameOver(true)
      refresh()
    }, GRAVITY_MS)
    return () => clearInterval(id)
  }, [refresh])

  useEffect(() => {
    const id = setInterval(() => {
      const eng = engineRef.current
      if (!eng || eng.state.topOut || botActionsRef.current.length === 0) return
      const action = botActionsRef.current.shift()!
      applyAction(eng, action)
      if (botActionsRef.current.length === 0) {
        const { active, next } = eng.state
        if (active) { addPiece(next[next.length - 1]); requestMove() }
      }
      refresh()
    }, BOT_THINK_MS)
    return () => clearInterval(id)
  }, [addPiece, requestMove, refresh])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const eng = engineRef.current
      if (!eng || eng.state.topOut) return
      const action = resolveAction(e.code, bindings.current)
      if (!action) return
      e.preventDefault()
      const prevType = eng.state.active?.type
      applyAction(eng, action)
      if (prevType !== eng.state.active?.type && eng.state.active) {
        addPiece(eng.state.next[eng.state.next.length - 1])
        requestMove()
      }
      if (eng.state.topOut) setGameOver(true)
      refresh()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [addPiece, requestMove, refresh])

  useEffect(() => { startGame() }, [startGame])

  const eng = engineRef.current
  if (!eng) return null

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center text-white">
      <div className="flex gap-6 items-start">
        <HoldPiece type={eng.state.hold} used={eng.state.holdUsed} />
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-white/40">Lines: {eng.state.linesCleared}</div>
          <GameBoard state={eng.state} ghostRow={eng.getGhostRow()} />
          {gameOver && (
            <div className="flex flex-col items-center gap-3 mt-4">
              <div className="text-xl font-bold text-red-400">GAME OVER</div>
              <button
                onClick={startGame}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium"
              >
                Play Again
              </button>
            </div>
          )}
        </div>
        <NextQueue pieces={eng.state.next} />
      </div>
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
  }
}
