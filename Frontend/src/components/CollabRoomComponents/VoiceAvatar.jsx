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

// Renders one member as an avatar whose halo swells with their live audio
// level (0..1). Only the speaking user carries a non-zero level.
export default function VoiceAvatar({ name, level = 0, self = false, size = 34 }) {
  const speaking = level > 0.12
  // Halo scales with volume, kept subtle so it reads as "voice" not a bounce.
  const haloScale = 1 + Math.min(level, 1) * 0.7

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
      title={self ? `${name} (you)` : name}
    >
      {/* Audio-reactive halo behind the avatar. */}
      <span
        className={cn('absolute inset-0 rounded-full', speaking ? 'bg-success/25' : 'bg-transparent')}
        style={{ transform: `scale(${haloScale})`, transition: 'transform 80ms linear' }}
      />
      <span
        className={cn(
          'relative grid h-full w-full place-items-center rounded-full font-mono font-semibold ring-2 ring-background',
          pickColor(name),
          self ? 'opacity-100' : 'opacity-70',
        )}
        style={{ fontSize: size * 0.38 }}
      >
        {initials(name)}
      </span>
      {/* Green pulsing dot while speaking, dim otherwise. */}
      <span
        className={cn(
          'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background',
          speaking ? 'bg-success animate-[pulse-dot_1.2s_ease-in-out_infinite]' : 'bg-muted-foreground/40',
        )}
      />
    </div>
  )
}
