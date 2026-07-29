// Where the backend lives.
//
// Set VITE_API_URL at build time (Vite inlines it, so it must exist when
// `npm run build` runs, not when the server starts). The localhost fallback
// keeps `npm run dev` working with no .env at all.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// The socket connects to the same origin as the API - they are one server.
export const SOCKET_URL = API_URL

// A production build silently pointing at localhost is the single easiest way
// to ship a broken deploy, so say so loudly instead.
if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.warn(
    '[CodeForge] VITE_API_URL was not set at build time - this build is talking to ' +
      'http://localhost:3000 and will not work for anyone but you.'
  )
}
