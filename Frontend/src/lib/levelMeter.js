// Loudness for any number of streams at once, from a single AudioContext.
//
// ONE context, not one per stream. Browsers cap how many a page may open -
// Chrome allows about six - and a three-way call plus the local mic would burn
// four of them for no reason. This replaced a per-stream hook for exactly that.
//
// Sampling and publishing are deliberately different rates. The waveform is read
// every animation frame, because speech peaks are short and a slower sample
// misses them. React is told far less often: the halo these numbers drive has an
// 80ms CSS transition, so anything faster is invisible, and re-rendering the room
// sixty times a second per peer is real work for no visible gain.

const PUBLISH_MS = 80

// Levels are rounded before publishing so a stream that is merely idling does
// not re-render the room on microscopic changes.
const STEP = 0.04

export function createLevelMeter({ onChange }) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  const ctx = new AudioCtx()
  // A context created outside a click handler starts suspended, and a suspended
  // one reports pure silence rather than failing.
  ctx.resume().catch(() => {})

  const tracked = new Map()
  let raf = 0
  let lastPublish = 0
  let published = ''

  const publish = () => {
    const levels = {}
    let signature = ''
    for (const [key, entry] of tracked) {
      const value = Math.round(entry.level / STEP) * STEP
      levels[key] = value
      signature += `${key}:${value.toFixed(2)}|`
    }
    if (signature === published) return
    published = signature
    onChange(levels)
  }

  const tick = () => {
    for (const entry of tracked.values()) {
      entry.analyser.getByteTimeDomainData(entry.data)
      // RMS of the waveform approximates perceived loudness.
      let sum = 0
      for (let i = 0; i < entry.data.length; i++) {
        const v = (entry.data[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / entry.data.length)
      // Smooth, so the halo glides instead of flickering.
      entry.level = entry.level * 0.8 + Math.min(rms * 2.4, 1) * 0.2
    }

    const now = performance.now()
    if (now - lastPublish >= PUBLISH_MS) {
      lastPublish = now
      publish()
    }

    raf = requestAnimationFrame(tick)
  }

  raf = requestAnimationFrame(tick)

  return {
    add(key, stream) {
      if (tracked.has(key) || !stream?.getAudioTracks?.().length) return
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      tracked.set(key, {
        source,
        analyser,
        data: new Uint8Array(analyser.fftSize),
        level: 0,
      })
    },

    remove(key) {
      const entry = tracked.get(key)
      if (!entry) return
      entry.source.disconnect()
      tracked.delete(key)
      // Force the next publish through, so the departed key actually disappears
      // instead of being held back as "unchanged".
      published = ''
    },

    keys: () => [...tracked.keys()],

    destroy() {
      cancelAnimationFrame(raf)
      for (const entry of tracked.values()) entry.source.disconnect()
      tracked.clear()
      ctx.close()
    },
  }
}
