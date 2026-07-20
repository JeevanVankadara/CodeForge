import { Link } from 'react-router-dom'
import { Copy, Save } from 'lucide-react'
import { toast } from 'react-toastify'
import { Logo } from '../site/Logo.jsx'
import PresenceBar from './PresenceBar.jsx'

// Room header: brand, copyable room code, live presence, and the Save action.
// Presence + Save are room-only, so this stays separate from the compiler bar.
export default function RoomTopBar({ roomId, users, selfLevel, micStatus, onSave, saving }) {
  const copyCode = () => {
    navigator.clipboard?.writeText(roomId)
    toast.success('Room code copied', { theme: 'dark' })
  }

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
      <div className="flex items-center gap-4">
        <Logo subtitle="Room" />
        <button
          onClick={copyCode}
          title="Copy room code"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-panel-elevated px-2.5 py-1 font-mono text-xs tracking-[0.14em] text-primary transition-colors hover:border-primary/50"
        >
          {roomId}
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      <PresenceBar users={users} selfLevel={selfLevel} micStatus={micStatus} />

      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="rounded-md px-2.5 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          Home
        </Link>
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
