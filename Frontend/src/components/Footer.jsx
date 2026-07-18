// Site footer for the home/marketing layout.
export default function Footer() {
  return (
    <footer className="relative border-t border-border/60">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 font-mono text-xs text-muted-foreground sm:flex-row">
        <div>© 2026 CodeRoom Systems</div>
        <div className="flex items-center gap-6">
          <a className="hover:text-foreground" href="#">About</a>
          <a className="hover:text-foreground" href="#">GitHub</a>
          <span className="text-muted-foreground/60">v2.4.0</span>
        </div>
      </div>
    </footer>
  )
}
