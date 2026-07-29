import axios from 'axios'
import { API_URL } from './config'

// Auth-protected, because each call mints TURN credentials.
const api = axios.create({ baseURL: API_URL, withCredentials: true })

// Cached, but no longer forever. Phase 2 kept this for the lifetime of the page,
// which was fine while the answer was public STUN. TURN credentials expire, and
// a tab left open all day would otherwise build a call on dead ones.
let cached = null

// Refetched a minute before expiry, so a call starting right now is never handed
// credentials that die during negotiation.
const REFRESH_MARGIN_SECONDS = 60

// Losing the request should degrade voice, not disable it - plain STUN still
// connects two peers on any ordinary home network.
const FALLBACK = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  iceTransportPolicy: 'all',
}

const stillFresh = (entry) => {
  if (!entry) return false
  // No expiry means STUN only, which never goes stale.
  if (!entry.expiresAt) return true
  return entry.expiresAt - REFRESH_MARGIN_SECONDS > Math.floor(Date.now() / 1000)
}

// Proving TURN actually works is otherwise very hard: a direct connection will
// succeed and the relay never gets exercised. Setting this forces every
// candidate through TURN, so if a call still connects, the relay is genuinely
// working. In the console:
//
//   localStorage.setItem('codeforge:forceRelay', '1')   // then rejoin voice
//   localStorage.removeItem('codeforge:forceRelay')
//
const forcedPolicy = () => {
  if (!import.meta.env.DEV) return null
  try {
    return localStorage.getItem('codeforge:forceRelay') === '1' ? 'relay' : null
  } catch {
    return null
  }
}

export async function getRtcConfig() {
  if (!stillFresh(cached)) {
    try {
      const { data } = await api.get('/rtc/ice')
      cached = {
        iceServers: data.iceServers ?? FALLBACK.iceServers,
        iceTransportPolicy: data.iceTransportPolicy ?? 'all',
        expiresAt: data.expiresAt ?? null,
      }
    } catch {
      cached = { ...FALLBACK, expiresAt: null }
    }
  }

  // Built explicitly rather than spread, so expiresAt - our bookkeeping, not
  // RTCPeerConnection's - never leaks into the connection config.
  return {
    iceServers: cached.iceServers,
    iceTransportPolicy: forcedPolicy() ?? cached.iceTransportPolicy,
  }
}
