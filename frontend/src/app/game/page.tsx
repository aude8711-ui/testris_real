'use client'
import { useEffect, useRef, useCallback, useState } from 'react'
import { GameEngine } from '@/lib/tetris/engine'
import { resolveAction, loadBindings } from '@/lib/tetris/keybindings'
import { GameBoard } from '@/components/game/GameBoard'
import { NextQueue } from '@/components/game/NextQueue'
import { HoldPiece } from '@/components/game/HoldPiece'
import { BotPanel } from '@/components/game/BotPanel'

const GRAVITY_MS = 800
const BOT_CELL: Record<number, number> = { 1: 30, 2: 16, 3: 10 }

type Phase = 'config' | 'playing'

export default function GamePage() {
  const [phase, setPhase] = useState<Phase>('config')
  const [botCount, setBotCount] = useState<1 | 2 | 3>(1)
  const [tick, setTick] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const botsDeadRef = useRef(0)
  const engineRef = useRef<GameEngine | null>(null)
  const bindings = useRef(loadBindings())
  const refresh = useCallback(() => setTick(t => t + 1), [])

  function startGame() {
    engineRef.current = new GameEngine(Date.now())
    botsDeadRef.current = 0
    setGameOver(false)
    setWon(false)
    setPhase('playing')
    refresh()
  }

  const handleBotTopOut = useCallback(() => {
    botsDeadRef.current += 1
    if (botsDeadRef.current >= botCount) setWon(true)
  }, [botCount])

  // Player gravity
  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => {
      const eng = engineRef.current
      if (!eng || eng.state.topOut) return
      eng.tick()
      if (eng.state.topOut) setGameOver(true)
      refresh()
    }, GRAVITY_MS)
    return () => clearInterval(id)
  }, [phase, refresh])

  // Player keyboard
  useEffect(() => {
    if (phase !== 'playing') return
    const handler = (e: KeyboardEvent) => {
      const eng = engineRef.current
      if (!eng || eng.state.topOut) return
      const action = resolveAction(e.code, bindings.current)
      if (!action) return
      e.preventDefault()
      applyAction(eng, action)
      if (eng.state.topOut) setGameOver(true)
      refresh()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, refresh])

  const eng = engineRef.current
  const running = phase === 'playing' && !gameOver && !won

  // Config screen
  if (phase === 'config') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-8 text-white">
        <h1 className="text-3xl font-bold">vs AI</h1>
        <div className="flex flex-col items-center gap-3">
          <p className="text-white/50 text-sm">Number of bots</p>
          <div className="flex gap-3">
            {([1, 2, 3] as const).map(n => (
              <button
                key={n}
                onClick={() => setBotCount(n)}
                className={`w-12 h-12 rounded-lg text-lg font-bold border transition ${
                  botCount === n
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={startGame}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-lg font-semibold"
        >
          Start
        </button>
      </main>
    )
  }

  // Game screen
  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center text-white">
      <div className="flex gap-8 items-start">
        {/* Player panel */}
        <div className="flex gap-3 items-start">
          {eng && <HoldPiece type={eng.state.hold} used={eng.state.holdUsed} />}
          <div className="flex flex-col items-center gap-2">
            <div className="text-sm text-white/40">You · Lines: {eng?.state.linesCleared ?? 0}</div>
            <div className="relative">
              {eng && <GameBoard state={eng.state} ghostRow={eng.getGhostRow()} />}
              {(gameOver || won) && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
                  <div className={`text-xl font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>
                    {won ? 'YOU WIN!' : 'GAME OVER'}
                  </div>
                  <button
                    onClick={() => setPhase('config')}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium"
                  >
                    Play Again
                  </button>
                </div>
              )}
            </div>
          </div>
          {eng && <NextQueue pieces={eng.state.next} />}
        </div>

        {/* Bot panels */}
        <div className="flex flex-col gap-4 justify-center" style={{ height: 20 * 32 }}>
          {Array.from({ length: botCount }, (_, i) => (
            <BotPanel
              key={i}
              cellSize={BOT_CELL[botCount]}
              running={running}
              label={`Bot ${i + 1}`}
              onTopOut={handleBotTopOut}
            />
          ))}
        </div>
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
