'use client'
import { useEffect, useRef, useCallback, useState } from 'react'
import Link from 'next/link'
import { GameEngine } from '@/lib/tetris/engine'
import { calculateAttack } from '@/lib/tetris/attack'
import { resolveAction, loadBindings } from '@/lib/tetris/keybindings'
import { loadHandling } from '@/lib/tetris/handling'
import { GameBoard } from '@/components/game/GameBoard'
import { NextQueue } from '@/components/game/NextQueue'
import { HoldPiece } from '@/components/game/HoldPiece'
import { BotPanel } from '@/components/game/BotPanel'
import { applyAction } from '@/lib/tetris/actions'
import { DebugOverlay, type SideStats } from '@/components/game/DebugOverlay'
import { AttackFloaters, pruneFloaters, type Floater } from '@/components/game/AttackFloaters'

const GRAVITY_MS = 800
const BOT_CELL: Record<number, number> = { 1: 30, 2: 16, 3: 10 }
const DAS_ACTIONS = new Set(['move_left', 'move_right'])

interface Tally { sent: number; received: number; cancelled: number }
function emptyTally(): Tally { return { sent: 0, received: 0, cancelled: 0 } }

type Phase = 'config' | 'playing'

export default function GamePage() {
  const [phase, setPhase] = useState<Phase>('config')
  const [botCount, setBotCount] = useState<1 | 2 | 3>(1)
  const [tick, setTick] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [paused, setPaused] = useState(false)
  const [gameKey, setGameKey] = useState(0)
  const [debugOn, setDebugOn] = useState(false)
  const botsDeadRef = useRef(0)
  const tallyRef = useRef<Record<string, Tally>>({
    player: emptyTally(), bot0: emptyTally(), bot1: emptyTally(), bot2: emptyTally(),
  })
  const floatersRef = useRef<Floater[]>([])
  const floaterIdRef = useRef(0)
  const pushFloater = useCallback((side: string, value: number) => {
    floaterIdRef.current += 1
    floatersRef.current = [...floatersRef.current, { id: floaterIdRef.current, side, value, createdAt: Date.now() }]
  }, [])
  const engineRef = useRef<GameEngine | null>(null)
  const bindings = useRef(loadBindings())
  const handling = useRef(loadHandling())
  const refresh = useCallback(() => setTick(t => t + 1), [])
  const dasTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const arrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dasActionRef = useRef<string | null>(null)
  const softDropTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const clearDAS = useCallback(() => {
    if (dasTimerRef.current) { clearTimeout(dasTimerRef.current); dasTimerRef.current = null }
    if (arrTimerRef.current) { clearInterval(arrTimerRef.current); arrTimerRef.current = null }
    dasActionRef.current = null
  }, [])
  const clearSoftDrop = useCallback(() => {
    if (softDropTimerRef.current) { clearInterval(softDropTimerRef.current); softDropTimerRef.current = null }
  }, [])

  // Bot engines — created in startGame(), read directly (no forwardRef timing issues)
  const botEngineRef0 = useRef<GameEngine | null>(null)
  const botEngineRef1 = useRef<GameEngine | null>(null)
  const botEngineRef2 = useRef<GameEngine | null>(null)
  const botEngineRefs = [botEngineRef0, botEngineRef1, botEngineRef2]

  // Track player's last lock to detect new line clears
  const lastLockRef = useRef<object | null>(null)
  const checkPlayerAttackRef = useRef<() => void>(() => {})
  checkPlayerAttackRef.current = () => {
    const eng = engineRef.current
    if (!eng || !eng.state.lastLock) return
    if (eng.state.lastLock === lastLockRef.current) return
    lastLockRef.current = eng.state.lastLock
    const lock = eng.state.lastLock
    const attack = calculateAttack(lock)
    tallyRef.current.player.cancelled += lock.garbageCancelled
    if (attack <= 0) return
    tallyRef.current.player.sent += attack
    pushFloater('player', attack)
    for (let i = 0; i < botCount; i++) {
      botEngineRefs[i].current?.receiveGarbage(attack)
      tallyRef.current[`bot${i}`].received += attack
    }
  }
  function checkPlayerAttack() { checkPlayerAttackRef.current() }

  // Bot sends garbage to player
  const handleBotAttack = useCallback((botIndex: number, lines: number, cancelled: number) => {
    tallyRef.current[`bot${botIndex}`].cancelled += cancelled
    if (lines <= 0) return
    tallyRef.current[`bot${botIndex}`].sent += lines
    pushFloater(`bot${botIndex}`, lines)
    engineRef.current?.receiveGarbage(lines)
    tallyRef.current.player.received += lines
  }, [pushFloater])

  function startGame() {
    const seed = Date.now()
    engineRef.current = new GameEngine(seed)
    for (let i = 0; i < 3; i++) {
      botEngineRefs[i].current = new GameEngine(seed + (i + 1) * 99991 + Math.trunc(Math.random() * 9999))
    }
    lastLockRef.current = null
    botsDeadRef.current = 0
    tallyRef.current = { player: emptyTally(), bot0: emptyTally(), bot1: emptyTally(), bot2: emptyTally() }
    floatersRef.current = []
    setGameKey(k => k + 1)
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

  // 60fps render loop — also polls for lock-delay attacks (natural gravity lock)
  useEffect(() => {
    if (phase !== 'playing' || paused || gameOver || won) return
    let rafId: number
    const loop = () => {
      checkPlayerAttackRef.current()
      refresh()
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [phase, paused, gameOver, won, refresh])

  // Player gravity
  useEffect(() => {
    if (phase !== 'playing' || paused || gameOver || won) return
    const id = setInterval(() => {
      const eng = engineRef.current
      if (!eng || eng.state.topOut) return
      eng.tick()
      checkPlayerAttack()
      if (eng.state.topOut) setGameOver(true)
    }, GRAVITY_MS)
    return () => clearInterval(id)
  }, [phase, paused, gameOver, won]) // eslint-disable-line react-hooks/exhaustive-deps

  // Player keyboard with DAS/ARR
  useEffect(() => {
    if (phase !== 'playing' || gameOver || won) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.code === 'Escape') {
        const next = !paused
        if (next) engineRef.current?.pauseLock()
        else engineRef.current?.resumeLock()
        setPaused(next)
        clearDAS()
        return
      }
      if (paused) return
      const eng = engineRef.current
      if (!eng || eng.state.topOut) return
      let action = resolveAction(e.code, bindings.current)
      if (!action && (e.code === 'ControlLeft' || e.code === 'ControlRight')) action = 'rotate_ccw'
      if (!action) return
      e.preventDefault()
      applyAction(eng, action)
      checkPlayerAttack()
      if (eng.state.topOut) setGameOver(true)

      if (action === 'soft_drop' && !softDropTimerRef.current) {
        const softDropMs = Math.max(1, Math.round(GRAVITY_MS / handling.current.sdf))
        softDropTimerRef.current = setInterval(() => {
          const e2 = engineRef.current
          if (!e2 || e2.state.topOut) return
          applyAction(e2, 'soft_drop')
          checkPlayerAttack()
          if (e2.state.topOut) setGameOver(true)
        }, softDropMs)
      } else if (DAS_ACTIONS.has(action) && dasActionRef.current !== action) {
        clearDAS()
        dasActionRef.current = action
        const { das, arr } = handling.current
        dasTimerRef.current = setTimeout(() => {
          arrTimerRef.current = setInterval(() => {
            const e2 = engineRef.current
            if (!e2 || e2.state.topOut) return
            applyAction(e2, dasActionRef.current!)
            checkPlayerAttack()
            if (e2.state.topOut) setGameOver(true)
          }, arr)
        }, das)
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      const action = resolveAction(e.code, bindings.current)
        ?? ((e.code === 'ControlLeft' || e.code === 'ControlRight') ? 'rotate_ccw' : null)
      if (!action) return
      if (action === 'soft_drop') clearSoftDrop()
      else if (dasActionRef.current === action) clearDAS()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      clearDAS()
      clearSoftDrop()
    }
  }, [phase, paused, clearDAS, clearSoftDrop]) // eslint-disable-line react-hooks/exhaustive-deps

  const eng = engineRef.current
  const isOver = gameOver || won
  const running = phase === 'playing' && !isOver && !paused

  // Debug overlay derives everything from real engine state / calculateAttack
  // results already tallied above — no separate damage math here.
  floatersRef.current = pruneFloaters(floatersRef.current, Date.now())
  const debugSides: SideStats[] = phase === 'playing'
    ? [
        {
          label: '나 (Player)',
          ...tallyRef.current.player,
          combo: eng?.state.combo ?? 0,
          b2b: eng?.state.b2b ?? 0,
        },
        ...Array.from({ length: botCount }, (_, i) => ({
          label: `Bot ${i + 1}`,
          ...tallyRef.current[`bot${i}`],
          combo: botEngineRefs[i].current?.state.combo ?? 0,
          b2b: botEngineRefs[i].current?.state.b2b ?? 0,
        })),
      ]
    : []

  if (phase === 'config') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-8 text-white">
        <Link href="/play" className="absolute top-6 left-6 text-sm text-white/50 hover:text-white transition">← Back</Link>
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

  return (
    <div className="relative min-h-screen bg-[#0d0d0f] flex items-center justify-center text-white">
      <div className="flex gap-8 items-start">
        {/* Player panel */}
        <div className="flex gap-3 items-start">
          {eng && <HoldPiece type={eng.state.hold} used={eng.state.holdUsed} />}
          <div className="relative flex flex-col items-center gap-2">
            <div className="text-sm text-white/40">나 · 줄: {eng?.state.linesCleared ?? 0}</div>
            {eng && <GameBoard state={eng.state} ghostRow={eng.getGhostRow()} />}
            <AttackFloaters floaters={floatersRef.current} side="player" />
          </div>
          {eng && <NextQueue pieces={eng.state.next} />}
        </div>

        {/* Bot panels */}
        <div className="flex flex-col gap-4 justify-center" style={{ height: 20 * 32 }}>
          {Array.from({ length: botCount }, (_, i) => (
            <div key={`${gameKey}-${i}`} className="relative">
              <BotPanel
                engine={botEngineRefs[i].current!}
                cellSize={BOT_CELL[botCount]}
                running={running}
                label={`Bot ${i + 1}`}
                onTopOut={handleBotTopOut}
                onAttack={(lines, cancelled) => handleBotAttack(i, lines, cancelled)}
              />
              <AttackFloaters floaters={floatersRef.current} side={`bot${i}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Debug overlay toggle */}
      {phase === 'playing' && (
        <button
          onClick={() => setDebugOn(d => !d)}
          className="fixed top-4 right-4 z-50 px-2 py-1 text-xs rounded border border-white/20 bg-black/60 text-white/70 hover:bg-black/80"
        >
          Debug: {debugOn ? 'ON' : 'OFF'}
        </button>
      )}
      {debugOn && <DebugOverlay sides={debugSides} />}

      {/* Pause overlay */}
      {paused && !isOver && (
        <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-6">
          <div className="text-3xl font-bold text-white">일시정지</div>
          <div className="flex gap-3">
            <button
              onClick={() => { engineRef.current?.resumeLock(); setPaused(false) }}
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
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-8">
          <div className={`text-6xl font-bold tracking-widest ${won ? 'text-green-400' : 'text-red-400'}`}>
            {won ? 'YOU WIN' : 'YOU LOSE'}
          </div>
          <div className="flex gap-4">
            <button
              onClick={startGame}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-lg font-semibold"
            >
              Play Again
            </button>
            <button
              onClick={() => setPhase('config')}
              className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-lg font-semibold"
            >
              Main Menu
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

