import { useRef, useState } from 'react'

const KEY = 'cf:split'
const MIN = 20
const MAX = 70

const saved = () => {
  try {
    return Number(localStorage.getItem(KEY)) || 40
  } catch {
    return 40
  }
}

export const useSplit = () => {
  const [split, setSplit] = useState(saved)
  const containerRef = useRef(null)

  const startDrag = (e) => {
    e.preventDefault()
    const rect = containerRef.current.getBoundingClientRect()
    let pct = split
    document.body.style.userSelect = 'none'

    const move = (ev) => {
      pct = Math.min(MAX, Math.max(MIN, ((ev.clientX - rect.left) / rect.width) * 100))
      setSplit(pct)
    }
    const stop = () => {
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      try {
        localStorage.setItem(KEY, String(pct))
      } catch {
        return
      }
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }

  return { split, containerRef, startDrag }
}
