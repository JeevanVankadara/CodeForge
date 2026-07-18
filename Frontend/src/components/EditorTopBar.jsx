import { Link } from 'react-router-dom'
import { Logo } from './site/Logo.jsx'

// Slim bar above the editor. Brand + "Home" link let you go back to the homepage.
// The Save button only shows in a collab room (when a roomId is present).
export default function EditorTopBar({ roomId, onSave, saving }) {
  return (
    <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
      <div className="flex items-center gap-4">
        <Logo subtitle={roomId ? 'Room' : 'Compiler'} />
        {roomId && (
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {roomId}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="rounded-md px-2.5 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          Home
        </Link>
        {roomId && (
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>
    </div>
  )
}
