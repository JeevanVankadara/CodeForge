import { cn } from '../../lib/utils.js'

const toneMap = {
  success: 'text-success',
  primary: 'text-primary',
  warning: 'text-warning',
  destructive: 'text-destructive',
  purple: 'text-purple-accent',
  muted: 'text-muted-foreground',
}

const dotBg = {
  success: 'bg-success',
  primary: 'bg-primary',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  purple: 'bg-purple-accent',
  muted: 'bg-muted-foreground',
}

export function StatusChip({ tone = 'success', children, className, dot = true, square = false }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border bg-panel-elevated/60 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em]',
        toneMap[tone],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            square ? 'h-1.5 w-1.5' : 'h-1.5 w-1.5 rounded-full',
            dotBg[tone],
            'animate-[pulse-dot_2s_ease-in-out_infinite]',
          )}
        />
      )}
      <span className="text-foreground/85">{children}</span>
    </span>
  )
}
