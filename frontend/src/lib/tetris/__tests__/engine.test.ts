import { GameEngine } from '../engine'
import type { PieceType } from '../pieces'

test('spawns first piece on init', () => {
  const eng = new GameEngine(42)
  expect(eng.state.active).not.toBeNull()
})

test('hard drop locks piece and spawns next', () => {
  const eng = new GameEngine(42)
  const before = eng.state.active!.type
  eng.hardDrop()
  expect(eng.state.active?.type).not.toBe(before)
})

test('soft drop moves piece down', () => {
  const eng = new GameEngine(42)
  const startRow = eng.state.active!.row
  eng.softDrop()
  expect(eng.state.active!.row).toBeLessThan(startRow)
})

// Bug 1: Lock Out — game over only when piece locks entirely above visible board
test('Lock Out: topOut triggers when piece locks entirely in buffer zone', () => {
  const eng = new GameEngine(42)
  // Fill all 20 visible rows so no piece can enter from the buffer
  for (let r = 0; r < 20; r++)
    for (let c = 0; c < 10; c++)
      eng.state.board[r][c] = 'I' as PieceType
  eng.hardDrop()  // piece spawns at buffer row 20, can't enter visible → Lock Out
  expect(eng.state.topOut).toBe(true)
})

test('Lock Out: partial visible-board fill does NOT trigger topOut', () => {
  const eng = new GameEngine(42)
  // Fill only rows 0-16 — piece can still land in visible rows 17-19
  for (let r = 0; r < 17; r++)
    for (let c = 0; c < 10; c++)
      eng.state.board[r][c] = 'I' as PieceType
  eng.hardDrop()
  expect(eng.state.topOut).toBe(false)
})
test('move left/right shifts column', () => {
  const eng = new GameEngine(42)
  const col = eng.state.active!.col
  eng.move('left')
  expect(eng.state.active!.col).toBe(col - 1)
  eng.move('right')
  expect(eng.state.active!.col).toBe(col)
})
