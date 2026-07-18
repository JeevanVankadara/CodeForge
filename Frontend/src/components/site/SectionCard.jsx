import { cn } from '../../lib/utils.js'

const dotColor = {
  primary: 'bg-primary',
  success: 'bg-success',
  purple: 'bg-purple-accent',
  warning: 'bg-warning',
}

export function SectionCard({ title, tone = 'primary', children, className, action }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 md:p-8 transition-colors hover:border-border/80',
        className,
      )}
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.18em] text-foreground/80">
          <span className={cn('h-2 w-2', dotColor[tone])} />
          {title}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
