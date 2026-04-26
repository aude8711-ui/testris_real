'use client'
import { useState } from 'react'
import { loadBindings, saveBindings, defaultBindings } from '@/lib/tetris/keybindings'
import { Button } from '@/components/ui/Button'

const ACTION_LABELS: Record<string, string> = {
  move_left:  'Move Left',  move_right: 'Move Right', soft_drop:  'Soft Drop',
  hard_drop:  'Hard Drop',  rotate_cw:  'Rotate CW',  rotate_ccw: 'Rotate CCW',
  rotate_180: 'Rotate 180', hold:       'Hold',
}

export default function SettingsPage() {
  const [bindings, setBindings] = useState(loadBindings)
  const [listening, setListening] = useState<string | null>(null)

  function startListen(action: string) {
    setListening(action)
    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      const updated = { ...bindings, [action]: e.code }
      setBindings(updated)
      saveBindings(updated)
      setListening(null)
      window.removeEventListener('keydown', handler)
    }
    window.addEventListener('keydown', handler)
  }

  return (
    <main className="min-h-screen p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Key Bindings</h1>
      {Object.entries(ACTION_LABELS).map(([action, label]) => (
        <div key={action} className="flex justify-between items-center py-3 border-b border-white/10">
          <span className="text-white/70">{label}</span>
          <button
            className={`px-3 py-1 rounded font-mono text-sm min-w-28 text-center border ${
              listening === action ? 'border-indigo-400 text-indigo-300' : 'border-white/20 text-white/60'
            }`}
            onClick={() => startListen(action)}
          >
            {listening === action ? 'Press key...' : bindings[action as keyof typeof bindings]}
          </button>
        </div>
      ))}
      <Button
        variant="secondary"
        className="mt-6"
        onClick={() => { setBindings(defaultBindings); saveBindings(defaultBindings) }}
      >
        Reset to Defaults
      </Button>
    </main>
  )
}
