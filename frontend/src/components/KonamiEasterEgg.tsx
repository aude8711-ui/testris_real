'use client'
import { useEffect, useRef, useState } from 'react'

const SEQUENCE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
const CHAOS_MS = 7000
const FADE_MS = 500
const SIZE = 160
const GROW_MS = 300

interface MotionState {
  x: number
  y: number
  vx: number
  vy: number
  scale: number
  rotation: number
}

export function KonamiEasterEgg() {
  const [active, setActive] = useState(false)
  const [fading, setFading] = useState(false)
  const progressRef = useRef(0)
  const imgRef = useRef<HTMLImageElement>(null)
  const rafRef = useRef(0)
  const stateRef = useRef<MotionState>({ x: 0, y: 0, vx: 0, vy: 0, scale: 0, rotation: 0 })

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return

      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      const expected = SEQUENCE[progressRef.current]

      if (key === expected) {
        progressRef.current += 1
        if (progressRef.current === SEQUENCE.length) {
          progressRef.current = 0
          trigger()
        }
      } else {
        // restart the match — but allow the key to also be a valid first key
        progressRef.current = key === SEQUENCE[0] ? 1 : 0
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- trigger is stable per mount, defined below

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  function trigger() {
    cancelAnimationFrame(rafRef.current)
    setFading(false)
    setActive(true)

    stateRef.current = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      vx: (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 6),
      vy: (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 6),
      scale: 0,
      rotation: 0,
    }

    const start = performance.now()
    const maxSpeed = 16

    const tick = (now: number) => {
      const elapsed = now - start
      const st = stateRef.current

      // chaotic DVD-logo bounce: random jitter on top of the base velocity, clamped
      st.vx += (Math.random() - 0.5) * 1.8
      st.vy += (Math.random() - 0.5) * 1.8
      const speed = Math.hypot(st.vx, st.vy)
      if (speed > maxSpeed) {
        st.vx = (st.vx / speed) * maxSpeed
        st.vy = (st.vy / speed) * maxSpeed
      }
      st.x += st.vx
      st.y += st.vy

      const half = (SIZE * Math.max(st.scale, 0.05)) / 2
      if (st.x - half < 0) { st.x = half; st.vx = Math.abs(st.vx) }
      if (st.x + half > window.innerWidth) { st.x = window.innerWidth - half; st.vx = -Math.abs(st.vx) }
      if (st.y - half < 0) { st.y = half; st.vy = Math.abs(st.vy) }
      if (st.y + half > window.innerHeight) { st.y = window.innerHeight - half; st.vy = -Math.abs(st.vy) }

      st.rotation += 12 + (Math.random() - 0.5) * 8

      if (elapsed < GROW_MS) {
        st.scale = elapsed / GROW_MS
      } else {
        st.scale = 1 + Math.sin(elapsed / 60) * 0.25 + (Math.random() - 0.5) * 0.15
      }

      if (imgRef.current) {
        imgRef.current.style.transform =
          `translate(${st.x - SIZE / 2}px, ${st.y - SIZE / 2}px) scale(${Math.max(st.scale, 0.05)}) rotate(${st.rotation}deg)`
      }

      if (elapsed < CHAOS_MS) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setFading(true)
        setTimeout(() => setActive(false), FADE_MS)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  if (!active) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary runtime transform, not a static asset */}
      <img
        ref={imgRef}
        src="/easter-triangle.png"
        alt=""
        width={SIZE}
        height={SIZE}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: SIZE,
          height: SIZE,
          willChange: 'transform',
          opacity: fading ? 0 : 1,
          transition: fading ? `opacity ${FADE_MS}ms ease-out` : undefined,
        }}
      />
    </div>
  )
}
