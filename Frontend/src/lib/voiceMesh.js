// One RTCPeerConnection per peer, and the negotiation that brings each one up.
//
// Deliberately not a React hook. This is a long-lived external system with a
// lifecycle of its own; React's whole job is to create it, tell it who is on the
// call, and destroy it. Same shape as remoteCursors.js.
//
// WHO CALLS WHOM
// Exactly one side of a pair must send the offer. If both send one, both end up
// holding an offer the other cannot accept - "glare" - and the connection never
// forms. The rule here is a pure function of the two ids: the smaller one
// offers. It needs no coordination, both machines compute the same answer, and
// it cannot be upset by who joined first or by two people joining in the same
// instant.
//
// WHY MUTE IS NOT HERE-ISH
// The microphone track is added once, at setup, and never removed. Muting flips
// track.enabled, which changes nothing about the connection itself - so it can
// never fail, and never triggers a renegotiation.

// A connection that reaches 'failed' has exhausted every route it knew about.
// The fix is an ICE restart: a fresh offer that makes both sides rediscover
// their addresses from scratch, on the existing connection. Networks change -
// switching from Wi-Fi to a hotspot invalidates every candidate at once - so
// this is a normal event, not an error.
//
// Backing off matters: if the network is genuinely gone, retrying every second
// achieves nothing but noise, and each attempt is a fresh round of signalling.
const RESTART_DELAYS_MS = [1000, 3000, 8000]

export function createVoiceMesh({ config, localStream, sendSignal, onStream, onState }) {
  // socketId -> { pc, pending, offered, initiator, restarts, restartTimer }
  const peers = new Map()
  let destroyed = false

  const open = (peerId) => {
    const existing = peers.get(peerId)
    if (existing) return existing

    const pc = new RTCPeerConnection(config)
    const peer = { pc, pending: [], offered: false, initiator: false, restarts: 0, restartTimer: 0 }
    peers.set(peerId, peer)

    // Our microphone goes out over this connection.
    for (const track of localStream.getAudioTracks()) pc.addTrack(track, localStream)

    // Every route by which we might be reachable, discovered one at a time. They
    // are sent as they are found rather than in one batch at the end, so the
    // connection can start forming while discovery is still going. A null
    // candidate means "that was the last one".
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) sendSignal(peerId, 'candidate', candidate.toJSON())
    }

    // Their audio has arrived. This fires once the connection is up, without us
    // having asked for anything - the track was promised back in the SDP.
    pc.ontrack = ({ streams }) => {
      if (streams[0]) onStream(peerId, streams[0])
    }

    pc.onconnectionstatechange = () => {
      onState(peerId, pc.connectionState)

      // A working connection clears the history, so a blip an hour from now gets
      // the full three attempts again rather than inheriting an exhausted count.
      if (pc.connectionState === 'connected') peer.restarts = 0
      if (pc.connectionState === 'failed') scheduleRestart(peerId)
    }

    return peer
  }

  // Only the side that made the original offer restarts, for the same reason it
  // made the offer: if both sides restart at once they collide, and the
  // connection they were trying to repair stays broken.
  const scheduleRestart = (peerId) => {
    const peer = peers.get(peerId)
    if (destroyed || !peer || !peer.initiator || peer.restartTimer) return

    const delay = RESTART_DELAYS_MS[peer.restarts]
    if (delay === undefined) {
      console.warn('[voice] giving up on', peerId, 'after', peer.restarts, 'restarts')
      return
    }
    peer.restarts += 1

    peer.restartTimer = setTimeout(async () => {
      peer.restartTimer = 0
      // The peer may have left, or the whole call ended, while we waited.
      if (destroyed || peers.get(peerId) !== peer) return

      try {
        // iceRestart discards the old candidates and gathers again. The rest of
        // the session - the codec, the track - is untouched, so audio resumes
        // rather than restarting.
        const offer = await peer.pc.createOffer({ iceRestart: true })
        await peer.pc.setLocalDescription(offer)
        sendSignal(peerId, 'offer', { type: offer.type, sdp: offer.sdp })
      } catch (err) {
        console.error('[voice] ICE restart failed for', peerId, err)
      }
    }, delay)
  }

  // Candidates routinely overtake the description that gives them meaning, and
  // addIceCandidate throws if it arrives first. Anything early waits here.
  const drainPending = async (peer) => {
    for (const candidate of peer.pending.splice(0)) {
      try {
        await peer.pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        console.warn('[voice] discarded a queued candidate:', err.message)
      }
    }
  }

  const close = (peerId) => {
    const peer = peers.get(peerId)
    if (!peer) return
    if (peer.restartTimer) clearTimeout(peer.restartTimer)
    // Detached first: a closing connection still fires state changes, and they
    // would arrive after React has stopped caring.
    peer.pc.onicecandidate = null
    peer.pc.ontrack = null
    peer.pc.onconnectionstatechange = null
    peer.pc.close()
    peers.delete(peerId)
  }

  return {
    // Called for everyone on the call, on both sides. `initiator` decides which
    // of the two actually speaks first.
    async connect(peerId, { initiator }) {
      if (destroyed) return
      const peer = open(peerId)
      // Remembered because a repair, months of uptime later, has to be started
      // by the same side that started the original call.
      peer.initiator = initiator

      // Both the join ack and a peer-joined broadcast can name the same person,
      // so this must be safe to call twice.
      if (!initiator || peer.offered) return
      peer.offered = true

      try {
        const offer = await peer.pc.createOffer()
        await peer.pc.setLocalDescription(offer)
        sendSignal(peerId, 'offer', { type: offer.type, sdp: offer.sdp })
      } catch (err) {
        console.error('[voice] could not offer to', peerId, err)
      }
    },

    async accept({ from, kind, data }) {
      if (destroyed) return

      try {
        if (kind === 'offer') {
          // open() rather than get(): an offer is how we first hear of the peer
          // we did not initiate to.
          const peer = open(from)
          await peer.pc.setRemoteDescription(new RTCSessionDescription(data))
          await drainPending(peer)

          const answer = await peer.pc.createAnswer()
          await peer.pc.setLocalDescription(answer)
          sendSignal(from, 'answer', { type: answer.type, sdp: answer.sdp })
          return
        }

        const peer = peers.get(from)
        if (!peer) return

        if (kind === 'answer') {
          await peer.pc.setRemoteDescription(new RTCSessionDescription(data))
          await drainPending(peer)
          return
        }

        if (kind === 'candidate') {
          if (!peer.pc.remoteDescription) {
            peer.pending.push(data)
            return
          }
          await peer.pc.addIceCandidate(new RTCIceCandidate(data))
        }
      } catch (err) {
        console.error('[voice] bad', kind, 'from', from, err)
      }
    },

    disconnect: close,

    // Silences what we send without touching the connection. It also silences
    // our own level meter, which reads the same stream - correct, since a muted
    // person should not appear to be talking.
    setMuted(muted) {
      for (const track of localStream.getAudioTracks()) track.enabled = !muted
    },

    destroy() {
      destroyed = true
      for (const peerId of [...peers.keys()]) close(peerId)
    },

    // What each leg is actually doing, for when one of them will not come up.
    // The candidate type is the answer to the question this whole phase raises:
    //
    //   host  - direct, same network. The two machines are on one LAN.
    //   srflx - direct across the internet, discovered via STUN. The normal case.
    //   relay - going through a TURN server, because nothing direct worked.
    //
    // A leg stuck at 'connecting' with no relay option is the case TURN exists
    // to solve, and until Phase 6 lands it will simply never connect.
    async stats() {
      const report = {}

      for (const [peerId, peer] of peers) {
        const leg = {
          state: peer.pc.connectionState,
          ice: peer.pc.iceConnectionState,
          initiator: peer.initiator,
          restarts: peer.restarts,
          route: null,
        }

        try {
          const raw = await peer.pc.getStats()
          let pair = null
          raw.forEach((entry) => {
            if (entry.type === 'candidate-pair' && entry.state === 'succeeded' && entry.nominated) {
              pair = entry
            }
          })
          if (pair) {
            const local = raw.get(pair.localCandidateId)
            const remote = raw.get(pair.remoteCandidateId)
            leg.route = `${local?.candidateType ?? '?'} -> ${remote?.candidateType ?? '?'}`
          }
        } catch {
          // Diagnostics must never be the thing that breaks a call.
        }

        report[peerId] = leg
      }

      return report
    },
  }
}
