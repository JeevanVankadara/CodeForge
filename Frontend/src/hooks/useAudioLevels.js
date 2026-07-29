// Loudness for a named set of streams:
//   { self: MediaStream, [socketId]: MediaStream }  ->  { self: 0.4, [socketId]: 0 }
//
// This replaces the single-stream useAudioLevel from Phase 0. The split it made -
// capture in one place, measurement in another - was right; what changed is that
// there are now several streams to measure, and they must share one AudioContext.
//
// The meter is kept alive across changes to the set rather than rebuilt, so a
// third person joining does not tear down and recreate the audio graph for
// everyone already being measured.

import { useEffect, useMemo, useRef, useState } from 'react'
import { createLevelMeter } from '../lib/levelMeter.js'

export function useAudioLevels(streams) {
  const [levels, setLevels] = useState({})
  const meterRef = useRef(null)

  useEffect(() => {
    const keys = Object.keys(streams)

    if (keys.length === 0) {
      meterRef.current?.destroy()
      meterRef.current = null
      return
    }

    if (!meterRef.current) meterRef.current = createLevelMeter({ onChange: setLevels })
    const meter = meterRef.current

    for (const key of meter.keys()) {
      if (!keys.includes(key)) meter.remove(key)
    }
    for (const key of keys) meter.add(key, streams[key])
  }, [streams])

  // Unmount only. The effect above handles every change short of that.
  useEffect(
    () => () => {
      meterRef.current?.destroy()
      meterRef.current = null
    },
    [],
  )

  // Report only on streams that still exist. Without this the last measured
  // level for a departed peer would linger and freeze their halo mid-swell.
  return useMemo(() => {
    const current = {}
    for (const key of Object.keys(streams)) current[key] = levels[key] ?? 0
    return current
  }, [streams, levels])
}
