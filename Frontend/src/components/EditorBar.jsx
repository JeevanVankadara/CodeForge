import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Save, Play, Loader2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { Logo } from './site/Logo.jsx'
import LanguageSelector from './LanguageSelector.jsx'
import PresenceBar from './CollabRoomComponents/PresenceBar.jsx'

export default function EditorBar({
  roomId,
  language,
  onSelectLanguage,
  problemId,
  onLoadProblem,
  loadingProblem,
  onRun,
  running,
  runLabel,
  room,
}) {
  const [draft, setDraft] = useState(problemId || '')

  const copyCode = () => {
    navigator.clipboard?.writeText(roomId)
    toast.success('Room code copied', { theme: 'dark' })
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border/60 pb-3">
      <Logo subtitle={roomId ? 'Room' : 'Compiler'} />

      {roomId && (
        <button
          onClick={copyCode}
          title="Copy room code"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-panel-elevated px-2.5 font-mono text-xs tracking-[0.14em] text-primary transition-colors hover:border-primary/50"
        >
          {roomId}
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          onLoadProblem(draft)
        }}
        className="flex items-center gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Problem e.g. 345A"
          spellCheck={false}
          className="h-9 w-40 rounded-md border border-border bg-panel-elevated px-3 font-mono text-sm uppercase text-foreground placeholder:normal-case placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={loadingProblem}
          className="h-9 rounded-md border border-border px-3 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-60"
        >
          {loadingProblem ? 'Loading…' : 'Load'}
        </button>
      </form>

      <LanguageSelector language={language} onSelect={onSelectLanguage} />

      <button
        onClick={onRun}
        disabled={running}
        className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
        {runLabel || 'Run'}
      </button>

      <div className="ml-auto flex items-center gap-3">
        {room && <PresenceBar {...room.presence} />}
        <Link
          to="/"
          className="rounded-md px-2.5 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          Home
        </Link>
        {room && (
          <button
            onClick={room.onSave}
            disabled={room.saving}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {room.saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>
    </div>
  )
}
