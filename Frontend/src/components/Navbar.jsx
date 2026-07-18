import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Plus } from 'lucide-react'
import { Logo } from './site/Logo.jsx'
import { makeId, comingSoon } from '../lib/room.js'
import { useAuth } from '../context/AuthContext.jsx'

// Top navigation bar: brand + section links + session actions.
// Interview Room and Docs are placeholders (comingSoon) until those features exist.
export default function Navbar() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  // Start a fresh room; the home page card is where a runtime gets picked.
  const newSession = () => navigate(`/room/${makeId()}`)

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/room/DEMO-ROOM-01"
            className="rounded-md px-2.5 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Collab Room
          </Link>
          <button
            onClick={() => comingSoon('Interview Room')}
            className="rounded-md px-2.5 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Interview Room
          </button>
          <button
            onClick={() => comingSoon('Docs')}
            className="hidden items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground md:inline-flex"
          >
            <BookOpen className="h-4 w-4" />
            Docs
          </button>
          {/* Logged in -> show the user's name + Log out; otherwise the Log in link. */}
          {user ? (
            <>
              <span className="rounded-md px-2.5 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-foreground">
                {user.name}
              </span>
              <button
                onClick={logout}
                className="rounded-md px-2.5 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-md px-2.5 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Log in
            </Link>
          )}
          <button
            onClick={newSession}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.08)] hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Session
          </button>
        </div>
      </div>
    </header>
  )
}
