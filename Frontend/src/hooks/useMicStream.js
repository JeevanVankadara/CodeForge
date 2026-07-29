// Microphone capture, and nothing else: asks for the mic once and hands back the
// raw MediaStream.
//
// Capture is deliberately separate from measuring loudness. One stream can feed
// several consumers - useAudioLevels draws the avatar halo from it, and the voice
// layer will add its track to every peer connection - but calling getUserMedia
// twice opens the device twice, which is how you end up with two live mics and
// two recording indicators.
//
// status: idle | requesting | live | denied | unsupported

import { useEffect, useState } from 'react'

const AUDIO_CONSTRAINTS = {
  // Without echo cancellation everyone hears themselves back through their
  // peers' speakers. Harmless while the stream stays local, mandatory the moment
  // it is sent anywhere.
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
}

export function useMicStream(enabled = false) {
  const supported =
    typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
  const [stream, setStream] = useState(null)
  const [denied, setDenied] = useState(false)

  // Derived rather than stored, so there is only ever one source of truth about
  // whether the mic is open: the stream itself.
  const status = !enabled
    ? 'idle'
    : !supported
      ? 'unsupported'
      : denied
        ? 'denied'
        : stream
          ? 'live'
          : 'requesting'

  useEffect(() => {
    if (!enabled || !supported) return

    let cancelled = false
    let opened = null

    navigator.mediaDevices
      .getUserMedia({ audio: AUDIO_CONSTRAINTS })
      .then((mic) => {
        // The permission prompt is modal to the page, not to this component: the
        // user can leave the room while it is still open, and the promise
        // resolves anyway.
        if (cancelled) {
          mic.getTracks().forEach((t) => t.stop())
          return
        }
        opened = mic
        setStream(mic)
      })
      .catch(() => {
        if (!cancelled) setDenied(true)
      })

    return () => {
      cancelled = true
      // Stopping the tracks is what actually closes the device and clears the
      // browser's recording indicator. Dropping the reference does not.
      opened?.getTracks().forEach((t) => t.stop())
      // These tracks are now dead, so the stream must not outlive them - a
      // stale one here would read as "live" on the next attempt.
      setStream(null)
      setDenied(false)
    }
  }, [enabled, supported])

  return { stream, status }
}
