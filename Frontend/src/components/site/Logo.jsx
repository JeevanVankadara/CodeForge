import { Link } from 'react-router-dom'

export function Logo({ subtitle = 'Terminal' }) {
  return (
    <Link to="/" className="flex items-center gap-3 group">
      <img src="/logo.png" alt="CodeCollab" className="h-9 w-9 rounded-md" />
      <div className="font-mono text-sm">
        <span className="text-foreground font-semibold">CodeCollab</span>
        <span className="text-muted-foreground"> // {subtitle}</span>
      </div>
    </Link>
  )
}
