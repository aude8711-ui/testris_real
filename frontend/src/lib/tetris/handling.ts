export interface HandlingSettings {
  das: number  // ms
  arr: number  // ms
  sdf: number  // soft drop multiplier (gravity ×N)
}

export const defaultHandling: HandlingSettings = { das: 133, arr: 10, sdf: 20 }

export function loadHandling(): HandlingSettings {
  if (typeof window === 'undefined') return defaultHandling
  try {
    const stored = localStorage.getItem('testris_handling')
    return stored ? { ...defaultHandling, ...JSON.parse(stored) } : defaultHandling
  } catch {
    return defaultHandling
  }
}

export function saveHandling(h: HandlingSettings): void {
  localStorage.setItem('testris_handling', JSON.stringify(h))
}
