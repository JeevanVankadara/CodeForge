import { Link } from 'react-router-dom'

export function Logo({ subtitle = 'Terminal' }) {
  return (
    <Link to="/" className="flex items-center gap-3 group">
      <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground font-mono font-bold text-sm shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]">
        CR
      </div>
      <div className="font-mono text-sm">
        <span className="text-foreground font-semibold">CodeRoom</span>
        <span className="text-muted-foreground"> // {subtitle}</span>
      </div>
    </Link>
  )
}
