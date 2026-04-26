const { calculateTR, tierFromTR } = require('../src/socket/game')

test('winner gains TR, loser loses TR', () => {
  const { p1After, p2After } = calculateTR(1000, 1000, 'p1')
  expect(p1After).toBeGreaterThan(1000)
  expect(p2After).toBeLessThan(1000)
})

test('upset win yields more TR than expected win', () => {
  const { p1After: upset }   = calculateTR(500, 1500, 'p1')
  const { p1After: favored } = calculateTR(1500, 500, 'p1')
  expect(upset - 500).toBeGreaterThan(1500 - favored)
})

test('tierFromTR maps correctly', () => {
  expect(tierFromTR(0)).toBe('D')
  expect(tierFromTR(2500)).toBe('B')
  expect(tierFromTR(6000)).toBe('X')
})
