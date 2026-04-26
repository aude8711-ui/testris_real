import { GameEngine } from '../engine'

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

test('move left/right shifts column', () => {
  const eng = new GameEngine(42)
  const col = eng.state.active!.col
  eng.move('left')
  expect(eng.state.active!.col).toBe(col - 1)
  eng.move('right')
  expect(eng.state.active!.col).toBe(col)
})
