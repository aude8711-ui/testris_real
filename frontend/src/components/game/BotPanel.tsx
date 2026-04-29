'use client'
import { useEffect, useRef, useCallback, useState } from 'react'
import { GameEngine } from '@/lib/tetris/engine'
import { calculateAttack } from '@/lib/tetris/attack'
import { applyAction } from '@/lib/tetris/actions'
import { useBot } from '@/lib/workers/useBot'
import { GameBoard } from './GameBoard'

const GRAVITY_MS = 800
const BOT_THINK_MS = 100

interface Props {
  engine: GameEngine
  cellSize: number
  running: boolean
  label: string
  onTopOut: () => void
  onAttack?: (lines: number) => void
}

export function BotPanel({ engine, cellSize, running, label, onTopOut, onAttack }: Props) {
  const [tick, setTick] = useState(0)
  // engineRef is initialized from the engine prop — stable for this component's lifetime
  const engineRef = useRef<GameEngine>(engine)
  const notifiedRef = useRef(false)
  const botActionsRef = useRef<string[]>([])
  const onTopOutRef = useRef(onTopOut)
  onTopOutRef.current = onTopOut
  const onAttackRef = useRef(onAttack)
  onAttackRef.current = onAttack
  const lastLockRef = useRef<object | null>(null)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  const { initBot, addPiece, requestMove } = useBot({
    onMove: (actions: string[], _hold: boolean) => { botActionsRef.current = actions },
  })

  useEffect(() => {
    notifiedRef.current = false
    lastLockRef.current = null
    botActionsRef.current = []
    refresh()
    const { active, next } = engine.state
    if (active) {
      initBot(active.type, next)
      setTimeout(() => requestMove(), 50)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 60fps render loop
  useEffect(() => {
    if (!running) return
    let rafId: number
    const loop = () => { refresh(); rafId = requestAnimationFrame(loop) }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [running, refresh])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const eng = engineRef.current
      if (!eng || eng.state.topOut) return
      const prevType = eng.state.active?.type
      eng.tick()
      if (eng.state.active?.type !== prevType) botActionsRef.current = []
      if (eng.state.topOut && !notifiedRef.current) {
        notifiedRef.current = true
        onTopOutRef.current()
      }
    }, GRAVITY_MS)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const eng = engineRef.current
      if (!eng || eng.state.topOut || botActionsRef.current.length === 0) return
      const action = botActionsRef.current.shift()!
      applyAction(eng, action)

      if (eng.state.topOut && !notifiedRef.current) {
        notifiedRef.current = true
        onTopOutRef.current()
        return
      }

      if (eng.state.lastLock !== lastLockRef.current) {
        lastLockRef.current = eng.state.lastLock
        const attack = calculateAttack(eng.state.lastLock!)
        if (attack > 0) onAttackRef.current?.(attack)
      }

      if (botActionsRef.current.length === 0) {
        const { active } = eng.state
        if (active) {
          addPiece(active.type)
          requestMove(eng.state.board.map(row => row.map(c => (c ? 1 : 0))))
        }
      }
    }, BOT_THINK_MS)
    return () => clearInterval(id)
  }, [running, addPiece, requestMove])

  const eng = engineRef.current

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
