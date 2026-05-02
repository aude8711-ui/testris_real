import type { LockResult } from './engine'

const BASE_ATTACK: Record<number, Record<string, number>> = {
  0: { none: 0, mini: 0, full: 0 },
  1: { none: 0, mini: 1, full: 2 },
  2: { none: 1, mini: 1, full: 4 },
  3: { none: 2, mini: 2, full: 6 },
  4: { none: 4, mini: 4, full: 4 },
}

export function calculateAttack(result: LockResult): number {
  if (result.linesCleared === 0) return result.surge
  let attack = BASE_ATTACK[result.linesCleared]?.[result.tSpin] ?? 0
  if (result.b2b > 0 && (result.linesCleared === 4 || result.tSpin !== 'none')) attack += 1
  if (result.allClear) return 5 + attack + result.surge
  return Math.floor(attack * (1 + 0.25 * (result.combo - 1))) + result.surge
}
