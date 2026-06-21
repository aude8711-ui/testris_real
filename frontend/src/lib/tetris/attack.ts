import type { LockResult } from './engine'

const BASE_ATTACK: Record<number, Record<string, number>> = {
  0: { none: 0, mini: 0, full: 0 },
  1: { none: 0, mini: 1, full: 2 },
  2: { none: 1, mini: 1, full: 4 },
  3: { none: 2, mini: 2, full: 6 },
  4: { none: 4, mini: 4, full: 4 },
}

// TETR.IO "Classic" combo table — additive bonus on top of base attack,
// keyed directly by LockResult.combo (0 = no combo yet). Capped at 5 for combo >= 10.
const COMBO_BONUS = [0, 1, 1, 2, 2, 3, 3, 4, 4, 4]

function comboBonus(combo: number): number {
  return combo < COMBO_BONUS.length ? COMBO_BONUS[combo] : 5
}

export function calculateAttack(result: LockResult): number {
  if (result.linesCleared === 0) return result.surge
  let attack = BASE_ATTACK[result.linesCleared]?.[result.tSpin] ?? 0
  if (result.b2b > 0 && (result.linesCleared === 4 || result.tSpin !== 'none')) attack += 1
  if (result.allClear) return 3 + attack + result.surge
  return attack + comboBonus(result.combo) + result.surge
}
