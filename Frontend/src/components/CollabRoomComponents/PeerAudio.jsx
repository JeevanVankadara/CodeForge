import { useEffect, useRef } from 'react'

// Plays one peer's audio. Renders nothing visible - an <audio> element is simply
// how a browser is asked to make a MediaStream audible.
//
// A stream cannot be handed over as a src attribute; it has to be assigned to
// the element's srcObject property, which is why this needs a ref at all.
export default function PeerAudio({ stream }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !stream) return

    el.srcObject = stream
    // Browsers refuse to play audio on a page the user has never interacted
    // with. The "join voice" click is that interaction, so this should always
    // succeed here - but a rejected promise is unhandled otherwise.
    el.play().catch((err) => console.warn('[voice] playback blocked:', err.message))

    return () => {
      el.srcObject = null
    }
  }, [stream])

  return <audio ref={ref} autoPlay playsInline />
}
