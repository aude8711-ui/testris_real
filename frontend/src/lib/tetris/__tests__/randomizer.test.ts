import { SevenBag } from '../randomizer'

test('generates exactly 7 unique pieces per bag', () => {
  const bag = new SevenBag(42)
  const pieces = Array.from({ length: 7 }, () => bag.next())
  expect(new Set(pieces).size).toBe(7)
})

test('pieces are always from valid set', () => {
  const valid = new Set(['I','O','T','S','Z','J','L'])
  const bag = new SevenBag(0)
  for (let i = 0; i < 21; i++) {
    expect(valid.has(bag.next())).toBe(true)
  }
})
