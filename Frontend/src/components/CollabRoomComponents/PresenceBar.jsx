import { Mic, MicOff, Loader2, PhoneCall, PhoneOff } from 'lucide-react'
import VoiceAvatar from './VoiceAvatar.jsx'
import { cn } from '../../lib/utils.js'

// Short label for the mic state, doubling as the join button's call to action.
const MIC_LABEL = {
  idle: 'join voice',
  requesting: 'starting…',
  live: 'on call',
  denied: 'mic blocked',
  unsupported: 'mic n/a',
}

// Top strip of everyone in the room. Each avatar carries its own live level and
// its own place on the call, so the strip shows at a glance who can hear whom.
export default function PresenceBar({
  users,
  micStatus = 'idle',
  voiceOn = false,
  voicePeers = [],
  muted = false,
  onToggleVoice,
  onToggleMute,
}) {
  const live = micStatus === 'live'
  const busy = micStatus === 'requesting'
  // A browser with no getUserMedia has nothing to toggle.
  const disabled = micStatus === 'unsupported' || !onToggleVoice

  // Each peer is a separate connection that can succeed or fail on its own, so
  // "2 people on the call" and "2 working audio links" are different facts. Show
  // both while they disagree - that gap is what a half-formed mesh looks like.
  const up = voicePeers.filter((p) => p.connection === 'connected').length
  const peerCount = voicePeers.length
  const peerLabel = !peerCount ? null : up === peerCount ? `· ${up}` : `· ${up}/${peerCount}`

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {users.map((u) => (
          <VoiceAvatar
            key={u.id}
            name={u.name}
            color={u.color}
            self={u.self}
            level={u.level ?? 0}
            muted={u.muted ?? false}
            onCall={u.onCall ?? false}
          />
        ))}
      </div>

      <div className="flex flex-col items-start leading-tight">
        <span className="hidden font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:block">
          Connected · {users.length}
        </span>

        <div className="flex items-center gap-2">
          {/* Voice is opt-in. The click is doing double duty: it is when we ask
              for the microphone, and it is the user gesture browsers demand
              before they will play any incoming peer audio. */}
          <button
            type="button"
            onClick={onToggleVoice}
            disabled={disabled}
            title={voiceOn ? 'Leave voice' : 'Join voice'}
            className={cn(
              'flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-60',
              live ? 'text-success' : 'text-muted-foreground/70 hover:text-foreground',
            )}
          >
            {busy ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : live ? (
              <PhoneCall className="h-3 w-3" />
            ) : (
              <PhoneOff className="h-3 w-3" />
            )}
            {MIC_LABEL[micStatus] ?? MIC_LABEL.idle}
            {/* Not the same as how many are in the room, since voice is opt-in. */}
            {live && peerLabel && <span className="text-success/70">{peerLabel}</span>}
          </button>

          {/* Only meaningful once there is a live microphone to silence. */}
          {live && (
            <button
              type="button"
              onClick={onToggleMute}
              title={muted ? 'Unmute' : 'Mute'}
              className={cn(
                'flex items-center gap-1 border-l border-border/60 pl-2 font-mono text-[10px] uppercase tracking-widest transition-colors',
                muted ? 'text-destructive' : 'text-muted-foreground/70 hover:text-foreground',
              )}
            >
              {muted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
              {muted ? 'muted' : 'mute'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
