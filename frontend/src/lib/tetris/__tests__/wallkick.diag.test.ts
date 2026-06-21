import { tryRotate } from '../rotation'
import type { GameBoard, ActivePiece } from '../engine'

const BOARD_ROWS = 24
const BOARD_COLS = 10

function emptyBoard(): GameBoard {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null))
}

// I piece vertical (rotation 1) occupies cols [col+1] only (PIECES.I[1] = [[0,1],[1,1],[2,1],[3,1]])
// so col=-1 puts it at col 0, touching left wall.
test('I piece vertical against LEFT wall rotates CCW (1->0) with kick', () => {
  const board = emptyBoard()
  const piece: ActivePiece = { type: 'I', rotation: 1, row: 10, col: -1 }
  const result = tryRotate(piece, -1, board)
  console.log('I 1->0 left wall result:', result)
  expect(result).not.toBeNull()
})

test('I piece vertical against LEFT wall rotates CW (1->2) with kick', () => {
  const board = emptyBoard()
  const piece: ActivePiece = { type: 'I', rotation: 1, row: 10, col: -1 }
  const result = tryRotate(piece, 1, board)
  console.log('I 1->2 left wall result:', result)
  expect(result).not.toBeNull()
})

// I piece vertical at col 2 -> occupies col 3 visually; pushing to right wall means col+1 = 9 => col = 8
test('I piece vertical against RIGHT wall rotates CW (1->2) with kick', () => {
  const board = emptyBoard()
  const piece: ActivePiece = { type: 'I', rotation: 1, row: 10, col: 8 }
  const result = tryRotate(piece, 1, board)
  console.log('I 1->2 right wall result:', result)
  expect(result).not.toBeNull()
})

test('I piece vertical against RIGHT wall rotates CCW (1->0) with kick', () => {
  const board = emptyBoard()
  const piece: ActivePiece = { type: 'I', rotation: 1, row: 10, col: 8 }
  const result = tryRotate(piece, -1, board)
  console.log('I 1->0 right wall result:', result)
  expect(result).not.toBeNull()
})

// T piece spawn (rotation 0) occupies cols [0,1,2] relative -> against left wall col=0
test('T piece against LEFT wall rotates CCW (0->3) with kick', () => {
  const board = emptyBoard()
  const piece: ActivePiece = { type: 'T', rotation: 0, row: 10, col: 0 }
  const result = tryRotate(piece, -1, board)
  console.log('T 0->3 left wall result:', result)
  expect(result).not.toBeNull()
})

test('T piece against RIGHT wall rotates CW (0->1) with kick', () => {
  const board = emptyBoard()
  const piece: ActivePiece = { type: 'T', rotation: 0, row: 10, col: 7 }
  const result = tryRotate(piece, 1, board)
  console.log('T 0->1 right wall result:', result)
  expect(result).not.toBeNull()
})
