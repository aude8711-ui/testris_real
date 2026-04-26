import type { LockResult } from './engine'

const BASE_ATTACK: Record<number, Record<string, number>> = {
  0: { none: 0, mini: 0, full: 0 },
  1: { none: 0, mini: 1, full: 2 },
  2: { none: 1, mini: 1, full: 4 },
  3: { none: 2, mini: 2, full: 6 },
  4: { none: 4, mini: 4, full: 4 },
}

const COMBO_TABLE = [0, 0, 2, 2, 3, 3, 4, 5]

export function calculateAttack(result: LockResult): number {
  if (result.linesCleared === 0) return 0
  let attack = BASE_ATTACK[result.linesCleared]?.[result.tSpin] ?? 0
  if (result.b2b && (result.linesCleared === 4 || result.tSpin !== 'none')) attack += 1
  if (result.allClear) return 10 + attack
  const comboIdx = Math.min(result.combo - 1, COMBO_TABLE.length - 1)
  attack += comboIdx >= 0 ? COMBO_TABLE[comboIdx] : 0
  return attack
}
