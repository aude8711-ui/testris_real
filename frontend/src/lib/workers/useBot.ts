import { useEffect, useRef, useCallback } from 'react'
import type { PieceType } from '@/lib/tetris/pieces'

type MoveMsg  = { type: 'move';  actions: string[]; hold: boolean }
type ReadyMsg = { type: 'ready' }
type BotMsg   = MoveMsg | ReadyMsg

interface UseBotOptions {
  onMove:   (actions: string[], hold: boolean) => void
  onReady?: () => void
}

export function useBot({ onMove, onReady }: UseBotOptions) {
  const workerRef = useRef<Worker | null>(null)
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    const worker = new Worker(
      new URL('./coldclear.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker
    worker.onmessage = (e: MessageEvent<BotMsg>) => {
      if (e.data.type === 'ready') onReadyRef.current?.()
      if (e.data.type === 'move') onMoveRef.current(e.data.actions, e.data.hold)
    }
    return () => worker.terminate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps — worker lifecycle tied to mount

  const initBot = useCallback((piece: PieceType, next: PieceType[]) => {
    workerRef.current?.postMessage({ type: 'init', piece, next })
  }, [])

  const addPiece = useCallback((piece: PieceType) => {
    workerRef.current?.postMessage({ type: 'addPiece', piece })
  }, [])

  const requestMove = useCallback((board?: number[][]) => {
    workerRef.current?.postMessage({ type: 'requestMove', board })
  }, [])

  const resetBot = useCallback((piece: PieceType, next: PieceType[]) => {
    workerRef.current?.postMessage({ type: 'reset', piece, next })
  }, [])

  return { initBot, addPiece, requestMove, resetBot }
}
