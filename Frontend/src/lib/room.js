import { toast } from 'react-toastify'

// Client-side room code, e.g. "ABC-12X-Q9Z".
export function makeId() {
  const seg = () => Math.random().toString(36).slice(2, 5).toUpperCase()
  return `${seg()}-${seg()}-${seg()}`
}

// Toast for buttons whose backend/feature isn't wired yet.
export const comingSoon = (what) =>
  toast.info(`${what} — will be implemented soon`, { theme: 'dark' })
