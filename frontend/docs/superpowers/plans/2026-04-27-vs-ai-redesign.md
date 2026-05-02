# vs AI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `/game` so the player and 1–3 bots each have their own independent board, with a config screen to choose bot count before starting.

**Architecture:** `GameBoard` gains a `cellSize` prop. A new `BotPanel` component manages one bot's engine + worker + game loop independently. `GamePage` is rewritten with a config phase (bot count selector) and game phase (player panel left, bot column right).

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Canvas-based tetris engine, Web Worker bot

---

## File Map

| File | Change |
|------|--------|
| `src/components/game/GameBoard.tsx` | Add `cellSize?: number` prop |
| `src/components/game/BotPanel.tsx` | **Create** — self-contained bot component |
| `src/app/game/page.tsx` | **Rewrite** — config screen + game screen |

---

## Task 1: Add `cellSize` prop to `GameBoard`

**Files:**
- Modify: `src/components/game/GameBoard.tsx`

- [ ] **Step 1: Update `GameBoard` to accept `cellSize` prop**

Replace the entire file with:

```tsx
'use client'
import { useEffect, useRef } from 'react'
import { PIECE_COLORS, PIECES } from '@/lib/tetris/pieces'
import type { GameState } from '@/lib/tetris/engine'

interface Props {
  state: GameState
  ghostRow: number
  cellSize?: number
}

const COLS = 10
const ROWS = 20

export function GameBoard({ state, ghostRow, cellSize = 32 }: Props) {
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
        ctx.strokeRect(c * cellSize, (ROWS - 1 - r) * cellSize, cellSize, cellSize)
      }
    }

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = state.board[r][c]
        if (cell) drawMino(ctx, c, ROWS - 1 - r, PIECE_COLORS[cell], cellSize)
      }
    }

    if (state.active) {
      const minos = PIECES[state.active.type][state.active.rotation]
      ctx.globalAlpha = 0.25
      for (const [dr, dc] of minos) {
        drawMino(ctx, state.active.col + dc, ROWS - 1 - (ghostRow + dr), PIECE_COLORS[state.active.type], cellSize)
      }
      ctx.globalAlpha = 1
      for (const [dr, dc] of minos) {
        drawMino(ctx, state.active.col + dc, ROWS - 1 - (state.active.row + dr), PIECE_COLORS[state.active.type], cellSize)
      }
    }
  }, [state, ghostRow, cellSize])

  return (
    <canvas
      ref={canvasRef}
      width={COLS * cellSize}
      height={ROWS * cellSize}
      className="border border-white/10"
    />
  )
}

function drawMino(ctx: CanvasRenderingContext2D, col: number, row: number, color: string, cell: number) {
  const x = col * cell
  const y = row * cell
  ctx.fillStyle = color
  ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2)
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.fillRect(x + 1, y + 1, cell - 2, 4)
}
```

- [ ] **Step 2: Verify existing player board still renders**

Run the dev server and visit `/game`. The player board should look identical to before (32px cells).

```bash
cd testris/frontend && npm run dev
```

- [ ] **Step 3: Commit**

```bash
git add src/components/game/GameBoard.tsx
git commit -m "feat(game): add cellSize prop to GameBoard"
```

---

## Task 2: Create `BotPanel` component

**Files:**
- Create: `src/components/game/BotPanel.tsx`

- [ ] **Step 1: Create `BotPanel.tsx`**

```tsx
'use client'
import { useEffect, useRef, useCallback, useState } from 'react'
import { GameEngine } from '@/lib/tetris/engine'
import { useBot } from '@/lib/workers/useBot'
import { GameBoard } from './GameBoard'

const GRAVITY_MS = 800
const BOT_THINK_MS = 200

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
    onReady: () => requestMove(),
    onMove: (actions) => { botActionsRef.current = actions },
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
      addPiece(next[next.length - 1])
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Gravity loop
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const eng = engineRef.current
      if (!eng || eng.state.topOut) return
      eng.tick()
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
          addPiece(next[next.length - 1])
          requestMove()
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
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/game/BotPanel.tsx
git commit -m "feat(game): add BotPanel component with independent engine and worker"
```

---

## Task 3: Rewrite `GamePage`

**Files:**
- Modify: `src/app/game/page.tsx`

- [ ] **Step 1: Replace `game/page.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd testris/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/game/page.tsx
git commit -m "feat(game): rewrite vs AI page with config screen and multi-bot support"
```

---

## Task 4: Smoke Test & Deploy

- [ ] **Step 1: Start dev server and test locally**

```bash
cd testris/frontend && npm run dev
```

Navigate to `http://localhost:3000/game` and verify:
1. Config screen shows "vs AI" title and bot count buttons (1/2/3)
2. Select 1 bot → Start → player board (left, full size) + 1 bot board (right, 30px cells)
3. Select 2 bots → Start → player board + 2 bot boards stacked vertically (16px cells)
4. Select 3 bots → Start → player board + 3 bot boards stacked vertically (10px cells)
5. Bots are actively playing (pieces moving on their boards)
6. When a bot tops out, its board shows "GAME OVER" overlay
7. When all bots top out, player board shows "YOU WIN!" overlay
8. When player tops out, player board shows "GAME OVER" overlay
9. "Play Again" returns to config screen

- [ ] **Step 2: Deploy to Vercel**

```bash
cd testris/frontend && vercel --prod --yes
```

Expected: deployment succeeds, production URL aliased to `https://frontend-rho-rust-62.vercel.app`
