import { defaultBindings, resolveAction } from '../keybindings'

test('resolves ArrowLeft to move_left', () => {
  expect(resolveAction('ArrowLeft', defaultBindings)).toBe('move_left')
})

test('resolves unknown key to null', () => {
  expect(resolveAction('KeyQ', defaultBindings)).toBeNull()
})

test('custom binding overrides default', () => {
  const custom = { ...defaultBindings, move_left: 'KeyA' }
  expect(resolveAction('KeyA', custom)).toBe('move_left')
  expect(resolveAction('ArrowLeft', custom)).toBeNull()
})
