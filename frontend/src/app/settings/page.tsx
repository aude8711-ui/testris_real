'use client'
import { useState } from 'react'
import Link from 'next/link'
import { loadBindings, saveBindings, defaultBindings, KeyBindings } from '@/lib/tetris/keybindings'
import { loadHandling, saveHandling, defaultHandling, HandlingSettings } from '@/lib/tetris/handling'

const CONTROL_ITEMS: { action: keyof KeyBindings; label: string; desc: string }[] = [
  { action: 'move_left',  label: 'Move Left',   desc: '피스를 왼쪽으로 이동' },
  { action: 'move_right', label: 'Move Right',  desc: '피스를 오른쪽으로 이동' },
  { action: 'soft_drop',  label: 'Soft Drop',   desc: '피스를 아래로 빠르게 이동 (SDF 배율 적용)' },
  { action: 'hard_drop',  label: 'Hard Drop',   desc: '피스를 즉시 바닥에 고정' },
  { action: 'rotate_cw',  label: 'Rotate CW',   desc: '피스를 시계 방향으로 회전' },
  { action: 'rotate_ccw', label: 'Rotate CCW',  desc: '피스를 반시계 방향으로 회전' },
  { action: 'rotate_180', label: 'Rotate 180',  desc: '피스를 180도 회전' },
  { action: 'hold',       label: 'Hold',        desc: '현재 피스를 홀드 슬롯에 저장' },
]

const HANDLING_ITEMS: { key: keyof HandlingSettings; label: string; desc: string; min: number; max: number; unit: string }[] = [
  { key: 'das', label: 'DAS', desc: '키를 누른 후 연속 이동이 시작되기까지의 지연 시간. 낮을수록 즉각 반응', min: 0, max: 500, unit: 'ms' },
  { key: 'arr', label: 'ARR', desc: '연속 이동 중 각 이동 사이의 간격. 0ms이면 즉시 벽까지 이동', min: 0, max: 500, unit: 'ms' },
  { key: 'sdf', label: 'Soft Drop', desc: '소프트드롭 속도 배율. 높을수록 빠르게 내려감 (중력의 N배)', min: 1, max: 40, unit: 'x' },
]

function formatKey(code: string): string {
  const arrows: Record<string, string> = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' }
  if (arrows[code]) return arrows[code]
  if (code.startsWith('Key')) return code.slice(3)
  if (code === 'Space') return 'Space'
  if (code === 'ControlLeft') return 'Ctrl L'
  if (code === 'ControlRight') return 'Ctrl R'
  if (code === 'ShiftLeft') return 'Shift L'
  if (code === 'ShiftRight') return 'Shift R'
  return code
}

export default function SettingsPage() {
  const [bindings, setBindings] = useState<KeyBindings>(loadBindings)
  const [handling, setHandling] = useState<HandlingSettings>(loadHandling)
  const [listening, setListening] = useState<string | null>(null)
  const [hoveredControl, setHoveredControl] = useState<string | null>(null)
  const [hoveredHandling, setHoveredHandling] = useState<string | null>(null)

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

  function resetControls() {
    setBindings(defaultBindings)
    saveBindings(defaultBindings)
  }

  function updateHandling(key: keyof HandlingSettings, value: number) {
    const updated = { ...handling, [key]: value }
    setHandling(updated)
    saveHandling(updated)
  }

  function resetHandling() {
    setHandling(defaultHandling)
    saveHandling(defaultHandling)
  }

  return (
    <main className="min-h-screen p-8 max-w-lg mx-auto text-white">
      <Link href="/play" className="inline-block mb-8 text-sm text-white/50 hover:text-white transition">← Back</Link>
      <h1 className="text-2xl font-bold mb-8">Settings</h1>

      {/* CONTROLS */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold tracking-widest text-white/40 uppercase mb-4">Controls</h2>
        <div className="rounded-xl border border-white/10 overflow-hidden">
          {CONTROL_ITEMS.map(({ action, label, desc }) => (
            <div
              key={action}
              className="flex justify-between items-center px-4 py-3 border-b border-white/10 last:border-0 hover:bg-white/5 transition cursor-default"
              onMouseEnter={() => setHoveredControl(action)}
              onMouseLeave={() => setHoveredControl(null)}
            >
              <div>
                <div className="text-sm text-white/80">{label}</div>
                {hoveredControl === action && (
                  <div className="text-xs text-white/40 mt-0.5">{desc}</div>
                )}
              </div>
              <button
                className={`px-3 py-1 rounded font-mono text-sm min-w-24 text-center border transition ${
                  listening === action
                    ? 'border-indigo-400 text-indigo-300 bg-indigo-500/10'
                    : 'border-white/20 text-white/60 hover:border-white/40'
                }`}
                onClick={() => startListen(action)}
              >
                {listening === action ? 'Press key…' : formatKey(bindings[action])}
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={resetControls}
          className="mt-3 text-xs text-white/30 hover:text-white/60 transition"
        >
          Reset to Defaults
        </button>
      </section>

      {/* HANDLING */}
      <section>
        <h2 className="text-xs font-semibold tracking-widest text-white/40 uppercase mb-4">Handling</h2>
        <div className="rounded-xl border border-white/10 overflow-hidden">
          {HANDLING_ITEMS.map(({ key, label, desc, min, max, unit }) => (
            <div
              key={key}
              className="px-4 py-3 border-b border-white/10 last:border-0 hover:bg-white/5 transition cursor-default"
              onMouseEnter={() => setHoveredHandling(key)}
              onMouseLeave={() => setHoveredHandling(null)}
            >
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className="text-sm text-white/80">{label}</span>
                  {hoveredHandling === key && (
                    <div className="text-xs text-white/40 mt-0.5">{desc}</div>
                  )}
                </div>
                <span className="font-mono text-sm text-white/60 min-w-16 text-right">
                  {handling[key]}{unit}
                </span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                value={handling[key]}
                onChange={e => updateHandling(key, Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-white/20 mt-1">
                <span>{min}{unit}</span>
                <span>{max}{unit}</span>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={resetHandling}
          className="mt-3 text-xs text-white/30 hover:text-white/60 transition"
        >
          Reset to Defaults
        </button>
      </section>
    </main>
  )
}
