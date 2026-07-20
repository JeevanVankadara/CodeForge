import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

// Confirmation prompt shown before an action that would erase the user's code.
// Generic on purpose: caller supplies the copy and the confirm handler.
export function Caution({
  open,
  title,
  message,
  confirmLabel = 'Continue',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) {
  // Let Escape dismiss the prompt while it's open.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onCancel?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-warning/15 text-warning">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <h2 className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-foreground">
            {title}
          </h2>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-warning px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-warning/90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
