import { calculateAttack } from '../attack'

test('Tetris (4 lines) sends 4', () => {
  expect(calculateAttack({ linesCleared: 4, tSpin: 'none', allClear: false, combo: 0, b2b: 0, surge: 0 })).toBe(4)
})

test('T-spin double sends 4', () => {
  expect(calculateAttack({ linesCleared: 2, tSpin: 'full', allClear: false, combo: 0, b2b: 0, surge: 0 })).toBe(4)
})

test('B2B Tetris sends 5', () => {
  expect(calculateAttack({ linesCleared: 4, tSpin: 'none', allClear: false, combo: 0, b2b: 1, surge: 0 })).toBe(5)
})

test('All-Clear adds 3', () => {
  expect(calculateAttack({ linesCleared: 1, tSpin: 'none', allClear: true, combo: 0, b2b: 0, surge: 0 })).toBe(3)
})

test('combo 3 sends 2 bonus', () => {
  expect(calculateAttack({ linesCleared: 1, tSpin: 'none', allClear: false, combo: 3, b2b: 0, surge: 0 })).toBe(2)
})
