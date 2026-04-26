import { tryRotate } from '../rotation'
import type { GameBoard, ActivePiece } from '../engine'

const emptyBoard: GameBoard = Array.from({ length: 20 }, () => Array(10).fill(null))

test('T-piece rotates CW from state 0→1', () => {
  const piece: ActivePiece = { type: 'T', rotation: 0, row: 0, col: 3 }
  const result = tryRotate(piece, 1, emptyBoard)
  expect(result).not.toBeNull()
  expect(result!.rotation).toBe(1)
})

test('O-piece rotates without wall kicks', () => {
  const piece: ActivePiece = { type: 'O', rotation: 0, row: 0, col: 4 }
  const result = tryRotate(piece, 1, emptyBoard)
  expect(result).not.toBeNull()
  expect(result!.kicked).toBe(false)
})
