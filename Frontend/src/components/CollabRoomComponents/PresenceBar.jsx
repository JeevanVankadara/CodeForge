import { Mic, MicOff } from 'lucide-react'
import VoiceAvatar from './VoiceAvatar.jsx'

// Short label for the mic state, shown next to the connected count.
const MIC_LABEL = {
  requesting: 'mic starting…',
  live: 'mic live',
  denied: 'mic blocked',
  unsupported: 'mic n/a',
  idle: 'mic off',
}

// Top strip of everyone in the room. The current user's avatar reacts to their
// real mic level; teammates stay idle until collab sockets feed real levels.
export default function PresenceBar({ users, selfLevel = 0, micStatus = 'idle' }) {
  const micOn = micStatus === 'live'

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {users.map((u) => (
          <VoiceAvatar
            key={u.id}
            name={u.name}
            color={u.color}
            self={u.self}
            level={u.self ? selfLevel : 0}
          />
        ))}
      </div>
      <div className="hidden flex-col leading-tight sm:flex">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Connected · {users.length}
        </span>
        <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground/70">
          {micOn ? <Mic className="h-3 w-3 text-success" /> : <MicOff className="h-3 w-3" />}
          {MIC_LABEL[micStatus] ?? MIC_LABEL.idle}
        </span>
      </div>
    </div>
  )
}
