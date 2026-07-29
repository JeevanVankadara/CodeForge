import { MicOff } from 'lucide-react'
import { cn } from '../../lib/utils.js'

// Deterministic colour per name so an avatar keeps its colour across renders.
const PALETTE = [
  'bg-primary text-primary-foreground',
  'bg-success text-black',
  'bg-purple-accent text-white',
  'bg-warning text-black',
]

function pickColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

function initials(name) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// Renders one member as an avatar whose halo swells with their live audio level
// (0..1), and whose badge says where they stand on the call.
//
// Three states worth telling apart, because they mean very different things:
//   in the room but not on the call - cannot hear you
//   on the call, muted             - can hear you, you cannot hear them
//   on the call, live              - halo swells while they speak
export default function VoiceAvatar({
  name,
  level = 0,
  self = false,
  size = 34,
  color,
  muted = false,
  onCall = false,
}) {
  const speaking = onCall && !muted && level > 0.12
  // Halo scales with volume, kept subtle so it reads as "voice" not a bounce.
  const haloScale = 1 + Math.min(level, 1) * 0.7

  const title = self
    ? `${name} (you)${muted ? ' - muted' : ''}`
    : onCall
      ? `${name}${muted ? ' - muted' : ' - on the call'}`
      : `${name} - not on the call`

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} title={title}>
      {/* Audio-reactive halo behind the avatar. */}
      <span
        className={cn('absolute inset-0 rounded-full', speaking ? 'bg-success/25' : 'bg-transparent')}
        style={{ transform: `scale(${haloScale})`, transition: 'transform 80ms linear' }}
      />
      <span
        className={cn(
          'relative grid h-full w-full place-items-center rounded-full font-mono font-semibold ring-2 ring-background',
          !color && pickColor(name),
          self ? 'opacity-100' : 'opacity-70',
        )}
        style={{
          fontSize: size * 0.38,
          ...(color ? { backgroundColor: color, color: '#0b0b0e' } : null),
        }}
      >
        {initials(name)}
      </span>
      {/* Badge: red crossed mic when muted, green when on the call (pulsing
          while speaking), dim grey when not on the call at all. */}
      <span
        className={cn(
          'absolute -bottom-0.5 -right-0.5 grid h-3 w-3 place-items-center rounded-full ring-2 ring-background',
          muted
            ? 'bg-destructive'
            : onCall
              ? speaking
                ? 'bg-success animate-[pulse-dot_1.2s_ease-in-out_infinite]'
                : 'bg-success'
              : 'bg-muted-foreground/40',
        )}
      >
        {muted && <MicOff className="h-2 w-2 text-destructive-foreground" />}
      </span>
    </div>
  )
}
