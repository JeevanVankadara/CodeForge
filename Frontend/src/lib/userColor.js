const PALETTE = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ef4444', '#14b8a6']

export function colorFor(key) {
  const source = String(key ?? '')
  let hash = 0
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}
