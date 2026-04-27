export type GameAction = 'move_left' | 'move_right' | 'soft_drop' | 'hard_drop' | 'rotate_cw' | 'rotate_ccw' | 'rotate_180' | 'hold'

export type KeyBindings = Record<GameAction, string>

export const defaultBindings: KeyBindings = {
  move_left:   'ArrowLeft',
  move_right:  'ArrowRight',
  soft_drop:   'ArrowDown',
  hard_drop:   'Space',
  rotate_cw:   'ArrowUp',
  rotate_ccw:  'KeyZ',
  rotate_180:  'KeyA',
  hold:        'KeyC',
}

export function resolveAction(code: string, bindings: KeyBindings): GameAction | null {
  const entry = Object.entries(bindings).find(([, key]) => key === code)
  return entry ? (entry[0] as GameAction) : null
}

export function loadBindings(): KeyBindings {
  if (typeof window === 'undefined') return defaultBindings
  try {
    const stored = localStorage.getItem('testris_keybindings')
    return stored ? { ...defaultBindings, ...JSON.parse(stored) } : defaultBindings
  } catch {
    return defaultBindings
  }
}

export function saveBindings(bindings: KeyBindings): void {
  localStorage.setItem('testris_keybindings', JSON.stringify(bindings))
}
