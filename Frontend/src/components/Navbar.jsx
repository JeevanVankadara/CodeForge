import { NavLink, Link } from 'react-router-dom'
import { Terminal, LogOut } from 'lucide-react'
import { Logo } from './site/Logo.jsx'
import { useAuth } from '../context/AuthContext.jsx'

// Top navigation bar: brand + the online compiler + the session identity block.
export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
        <Logo />

        <nav className="flex items-center gap-2 sm:gap-3">
          <NavLink
            to="/compiler"
            className={({ isActive }) =>
              [
                'inline-flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] transition-colors',
                isActive
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
              ].join(' ')
            }
          >
            <Terminal className="h-4 w-4" />
            Online Compiler
          </NavLink>

          {/* Logged in -> name chip + Log out; otherwise a single Log in action. */}
          {user ? (
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 py-1 pl-1 pr-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-semibold uppercase text-primary-foreground">
                {user.name?.[0] ?? '?'}
              </span>
              <span className="hidden max-w-40 truncate text-sm font-medium text-foreground sm:inline">
                {user.name}
              </span>
              <button
                onClick={logout}
                title="Log out"
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.08)] transition-colors hover:bg-primary/90"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
