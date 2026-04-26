'use client'
import { useEffect, useRef, useCallback, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { GameEngine } from '@/lib/tetris/engine'
import { resolveAction, loadBindings } from '@/lib/tetris/keybindings'
import { calculateAttack } from '@/lib/tetris/attack'
import { GameBoard } from '@/components/game/GameBoard'
import { NextQueue } from '@/components/game/NextQueue'
import { HoldPiece } from '@/components/game/HoldPiece'
import { AttackMeter } from '@/components/game/AttackMeter'
import { OpponentBoard } from '@/components/game/OpponentBoard'
import { useStore } from '@/lib/store'
import type { PieceType } from '@/lib/tetris/pieces'

type Phase = 'lobby' | 'playing' | 'result'

export default function RoomPage() {
  const { id: code } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const { connect, socket } = useStore()

  const [phase, setPhase] = useState<Phase>('lobby')
  const [tick, setTick] = useState(0)
  const [opponentBoard, setOpponentBoard] = useState<(PieceType | null)[][]>(
    Array.from({ length: 20 }, () => Array(10).fill(null))
  )
  const [pendingGarbage, setPendingGarbage] = useState(0)
  const [result, setResult] = useState<{ won: boolean } | null>(null)

  const engineRef  = useRef<GameEngine | null>(null)
  const sessionRef = useRef<string>('')
  const bindings   = useRef(loadBindings())
  const refresh    = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!session) return
    const tok = (session as any).accessToken ?? ''
    const sock = connect(tok)

    sock.emit('room:join', { code })

    sock.on('game:start', ({ sessionId }: { sessionId: string }) => {
      sessionRef.current = sessionId
      engineRef.current = new GameEngine(Date.now())
      setPhase('playing')
      refresh()
    })

    sock.on('game:board', ({ board }: { board: (PieceType | null)[][] }) => setOpponentBoard(board))

    sock.on('game:garbage', ({ lines }: { lines: number }) => {
      engineRef.current?.receiveGarbage(lines)
      setPendingGarbage(g => g + lines)
    })

    sock.on('game:result', ({ winnerId }: { winnerId: string }) => {
      setPhase('result')
      setResult({ won: winnerId === (session.user as any).id })
    })

    return () => {
      sock.emit('room:leave', { code })
      sock.off('game:start')
      sock.off('game:board')
      sock.off('game:garbage')
      sock.off('game:result')
    }
  }, [session, code, connect, refresh])

  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => {
      const eng = engineRef.current
      if (!eng || eng.state.topOut) return
      eng.tick()
      socket?.emit('game:board', { sessionId: sessionRef.current, board: eng.state.board })
      if (eng.state.topOut) {
        setPhase('result')
        socket?.emit('game:over', { sessionId: sessionRef.current, ranked: false })
      }
      refresh()
    }, 800)
    return () => clearInterval(id)
  }, [phase, socket, refresh])

  useEffect(() => {
    if (phase !== 'playing') return
    const handler = (e: KeyboardEvent) => {
      const eng = engineRef.current
      if (!eng || eng.state.topOut) return
      const action = resolveAction(e.code, bindings.current)
      if (!action) return
      e.preventDefault()
      const prev = eng.state.active?.type
      switch (action) {
        case 'move_left':  eng.move('left'); break
        case 'move_right': eng.move('right'); break
        case 'soft_drop':  eng.softDrop(); break
        case 'rotate_cw':  eng.rotate(1); break
        case 'rotate_ccw': eng.rotate(-1); break
        case 'rotate_180': eng.rotate(2); break
        case 'hold':       eng.hold(); break
        case 'hard_drop': {
          const atk = calculateAttack(eng.hardDrop())
          if (atk > 0) socket?.emit('game:garbage', { sessionId: sessionRef.current, lines: atk })
          break
        }
      }
      if (prev !== eng.state.active?.type)
        socket?.emit('game:board', { sessionId: sessionRef.current, board: eng.state.board })
      if (eng.state.topOut) {
        setPhase('result')
        socket?.emit('game:over', { sessionId: sessionRef.current, ranked: false })
      }
      refresh()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, socket, refresh])

  const eng = engineRef.current

  if (phase === 'lobby') return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Room <span className="font-mono text-indigo-400">{code}</span></h1>
      <p className="text-white/40 text-sm">Waiting for opponent...</p>
    </main>
  )

  if (phase === 'result') return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">{result?.won ? 'You Win!' : 'You Lose'}</h1>
      <a href="/play" className="text-indigo-400 underline text-sm">Back to Play</a>
    </main>
  )

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center gap-8">
      <HoldPiece type={eng?.state.hold ?? null} used={eng?.state.holdUsed ?? false} />
      <AttackMeter lines={pendingGarbage} />
      <GameBoard state={eng!.state} ghostRow={eng!.getGhostRow()} />
      <NextQueue pieces={eng?.state.next ?? []} />
      <OpponentBoard board={opponentBoard} nickname="Opponent" />
    </div>
  )
}
