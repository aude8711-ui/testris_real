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
  const [paused, setPaused] = useState(false)
  const botsDeadRef = useRef(0)
  const engineRef = useRef<GameEngine | null>(null)
  const bindings = useRef(loadBindings())
  const refresh = useCallback(() => setTick(t => t + 1), [])

  function startGame() {
    engineRef.current = new GameEngine(Date.now())
    botsDeadRef.current = 0
    setGameOver(false)
    setWon(false)
    setPaused(false)
    setPhase('playing')
    refresh()
  }

  const handleBotTopOut = useCallback(() => {
    botsDeadRef.current += 1
    if (botsDeadRef.current >= botCount) setWon(true)
  }, [botCount])

  // Player gravity — stops when paused
  useEffect(() => {
    if (phase !== 'playing' || paused) return
    const id = setInterval(() => {
      const eng = engineRef.current
      if (!eng || eng.state.topOut) return
      eng.tick()
      if (eng.state.topOut) setGameOver(true)
      refresh()
    }, GRAVITY_MS)
    return () => clearInterval(id)
  }, [phase, paused, refresh])

  // Player keyboard
  useEffect(() => {
    if (phase !== 'playing') return
    const handler = (e: KeyboardEvent) => {
      // ESC toggles pause
      if (e.code === 'Escape') {
        setPaused(p => !p)
        return
      }
      if (paused) return
      const eng = engineRef.current
      if (!eng || eng.state.topOut) return
      let action = resolveAction(e.code, bindings.current)
      if (!action && (e.code === 'ControlLeft' || e.code === 'ControlRight')) {
        action = 'rotate_ccw'
      }
      if (!action) return
      e.preventDefault()
      applyAction(eng, action)
      if (eng.state.topOut) setGameOver(true)
      refresh()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, paused, refresh])

  const eng = engineRef.current
  const isOver = gameOver || won
  const running = phase === 'playing' && !isOver && !paused

  // Config screen
  if (phase === 'config') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-8 text-white">
        <h1 className="text-3xl font-bold">vs AI</h1>
        <div className="flex flex-col items-center gap-3">
          <p className="text-white/50 text-sm">봇 수</p>
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
          시작
        </button>
        <div className="text-white/30 text-xs text-center leading-relaxed">
          ← → 이동 · ↑ 회전 · ↓ 소프트드롭 · Space 하드드롭<br />
          Z / Ctrl 반시계 회전 · C 홀드 · ESC 일시정지
        </div>
      </main>
    )
  }

  // Game screen
  return (
    <div className="relative min-h-screen bg-[#0d0d0f] flex items-center justify-center text-white">
      <div className="flex gap-8 items-start">
        {/* Player panel */}
        <div className="flex gap-3 items-start">
          {eng && <HoldPiece type={eng.state.hold} used={eng.state.holdUsed} />}
          <div className="flex flex-col items-center gap-2">
            <div className="text-sm text-white/40">나 · 줄: {eng?.state.linesCleared ?? 0}</div>
            {eng && <GameBoard state={eng.state} ghostRow={eng.getGhostRow()} />}
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

      {/* Pause overlay */}
      {paused && !isOver && (
        <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-6">
          <div className="text-3xl font-bold text-white">일시정지</div>
          <div className="flex gap-3">
            <button
              onClick={() => setPaused(false)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold"
            >
              계속하기
            </button>
            <button
              onClick={() => setPhase('config')}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-semibold"
            >
              나가기
            </button>
          </div>
          <div className="text-white/30 text-xs">ESC로 재개</div>
        </div>
      )}

      {/* Game over overlay */}
      {isOver && (
        <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-6">
          <div className={`text-4xl font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>
            {won ? '승리!' : '게임오버'}
          </div>
          <div className="text-white/50 text-sm">줄 클리어: {eng?.state.linesCleared ?? 0}</div>
          <div className="flex gap-3">
            <button
              onClick={startGame}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold"
            >
              다시하기
            </button>
            <button
              onClick={() => setPhase('config')}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-semibold"
            >
              나가기
            </button>
          </div>
        </div>
      )}
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
