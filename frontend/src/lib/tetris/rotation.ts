import { PIECES, PieceType } from './pieces'
import type { GameBoard, ActivePiece } from './engine'

const KICKS_JLSTZ: Record<string, [number, number][]> = {
  '0→1': [[ 0,0],[-1,0],[-1, 1],[0,-2],[-1,-2]],
  '1→0': [[ 0,0],[ 1,0],[ 1,-1],[0, 2],[ 1, 2]],
  '1→2': [[ 0,0],[ 1,0],[ 1,-1],[0, 2],[ 1, 2]],
  '2→1': [[ 0,0],[-1,0],[-1, 1],[0,-2],[-1,-2]],
  '2→3': [[ 0,0],[ 1,0],[ 1, 1],[0,-2],[ 1,-2]],
  '3→2': [[ 0,0],[-1,0],[-1,-1],[0, 2],[-1, 2]],
  '3→0': [[ 0,0],[-1,0],[-1,-1],[0, 2],[-1, 2]],
  '0→3': [[ 0,0],[ 1,0],[ 1, 1],[0,-2],[ 1,-2]],
  // 180-degree kicks
  '0→2': [[ 0,0],[ 0, 1],[ 1, 1],[-1, 1],[ 1, 0],[-1, 0]],
  '1→3': [[ 0,0],[ 1, 0],[ 1, 2],[ 1,-1],[ 0, 2],[ 0,-1]],
  '2→0': [[ 0,0],[ 0,-1],[-1,-1],[ 1,-1],[-1, 0],[ 1, 0]],
  '3→1': [[ 0,0],[-1, 0],[-1, 2],[-1,-1],[ 0, 2],[ 0,-1]],
}

const KICKS_I: Record<string, [number, number][]> = {
  '0→1': [[ 0,0],[-2,0],[ 1,0],[-2,-1],[ 1, 2]],
  '1→0': [[ 0,0],[ 2,0],[-1,0],[ 2, 1],[-1,-2]],
  '1→2': [[ 0,0],[-1,0],[ 2,0],[-1, 2],[ 2,-1]],
  '2→1': [[ 0,0],[ 1,0],[-2,0],[ 1,-2],[-2, 1]],
  '2→3': [[ 0,0],[ 2,0],[-1,0],[ 2, 1],[-1,-2]],
  '3→2': [[ 0,0],[-2,0],[ 1,0],[-2,-1],[ 1, 2]],
  '3→0': [[ 0,0],[ 1,0],[-2,0],[ 1,-2],[-2, 1]],
  '0→3': [[ 0,0],[-1,0],[ 2,0],[-1, 2],[ 2,-1]],
  // 180-degree kicks (same as JLSTZ)
  '0→2': [[ 0,0],[ 0, 1],[ 1, 1],[-1, 1],[ 1, 0],[-1, 0]],
  '1→3': [[ 0,0],[ 1, 0],[ 1, 2],[ 1,-1],[ 0, 2],[ 0,-1]],
  '2→0': [[ 0,0],[ 0,-1],[-1,-1],[ 1,-1],[-1, 0],[ 1, 0]],
  '3→1': [[ 0,0],[-1, 0],[-1, 2],[-1,-1],[ 0, 2],[ 0,-1]],
}

export function getKicks(type: PieceType, from: number, to: number): [number, number][] {
  const key = `${from}→${to}`
  if (type === 'O') return [[0, 0]]
  if (type === 'I') return KICKS_I[key] ?? [[0, 0]]
  return KICKS_JLSTZ[key] ?? [[0, 0]]
}

export function fitsOnBoard(piece: ActivePiece, board: GameBoard): boolean {
  const minos = PIECES[piece.type][piece.rotation]
  for (const [r, c] of minos) {
    const row = piece.row + r
    const col = piece.col + c
    if (row < 0 || row >= 20 || col < 0 || col >= 10) return false
    if (board[row][col] !== null) return false
  }
  return true
}

export function tryRotate(
  piece: ActivePiece,
  direction: 1 | -1 | 2,
  board: GameBoard
): (ActivePiece & { kicked: boolean }) | null {
  const to = direction === 2
    ? (piece.rotation + 2) % 4
    : (piece.rotation + direction + 4) % 4
  const kicks = getKicks(piece.type, piece.rotation, to)

  for (const [dc, dr] of kicks) {
    const candidate = { ...piece, rotation: to, col: piece.col + dc, row: piece.row + dr }
    if (fitsOnBoard(candidate, board)) {
      return { ...candidate, kicked: dc !== 0 || dr !== 0 }
    }
  }
  return null
}
