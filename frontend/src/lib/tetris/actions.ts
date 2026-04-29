import type { GameEngine } from './engine'

export function applyAction(eng: GameEngine, action: string) {
  switch (action) {
    case 'move_left':  eng.move('left'); break
    case 'move_right': eng.move('right'); break
    case 'soft_drop':  eng.softDrop(true); break
    case 'hard_drop':  eng.hardDrop(); break
    case 'rotate_cw':  eng.rotate(1); break
    case 'rotate_ccw': eng.rotate(-1); break
    case 'rotate_180': eng.rotate(2); break
    case 'hold':       eng.hold(); break
  }
}
