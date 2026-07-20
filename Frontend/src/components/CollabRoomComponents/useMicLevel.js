import { useEffect, useRef, useState } from 'react'

// Owns mic capture only: requests the microphone once and reports a smoothed
// 0..1 loudness for the local user so their avatar can react to their own voice.
// status: idle | requesting | live | denied | unsupported
export function useMicLevel(enabled = true) {
  const supported =
    typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
  const [level, setLevel] = useState(0)
  // Initial status is derived synchronously; the effect only moves it on/off from callbacks.
  const [status, setStatus] = useState(
    !enabled ? 'idle' : supported ? 'requesting' : 'unsupported',
  )
  const rafRef = useRef(0)

  useEffect(() => {
    if (!enabled || !supported) return

    let cancelled = false
    let stream
    let audioCtx

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 512
        source.connect(analyser)
        const data = new Uint8Array(analyser.fftSize)
        setStatus('live')

        const tick = () => {
          analyser.getByteTimeDomainData(data)
          // RMS of the waveform approximates perceived loudness.
          let sum = 0
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128
            sum += v * v
          }
          const rms = Math.sqrt(sum / data.length)
          // Smooth so the ring glides instead of flickering.
          setLevel((prev) => prev * 0.8 + Math.min(rms * 2.4, 1) * 0.2)
          rafRef.current = requestAnimationFrame(tick)
        }
        tick()
      })
      .catch(() => setStatus('denied'))

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      stream?.getTracks().forEach((t) => t.stop())
      audioCtx?.close()
    }
  }, [enabled, supported])

  return { level, status }
}
