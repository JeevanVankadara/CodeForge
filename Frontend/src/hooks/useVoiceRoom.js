// The React half of voice: who is on the call, and the lifecycle of the mesh
// that carries the audio between them.
//
// The negotiation itself lives in lib/voiceMesh.js. This file only decides when
// a mesh should exist, feeds it the peers the server reports, and publishes what
// comes back out of it so components can render it.
//
// It shares the room's socket rather than opening a second one, so it must not
// run until that socket is in the room and the microphone is open - the server
// rejects voice:join otherwise, and a connection built without a track to send
// would need renegotiating the moment one arrived. The caller enforces both by
// passing `enabled` and a ready `micStream`.
//
// Everything tears down and rebuilds on a reconnect, deliberately: socket.id is
// reissued each time the transport reconnects, so every peer's idea of our
// address goes stale at once.
//
// status: idle | joining | live | rejected

import { useCallback, useEffect, useRef, useState } from 'react'
import { createVoiceMesh } from '../lib/voiceMesh.js'
import { getRtcConfig } from '../lib/rtcConfig.js'

export function useVoiceRoom({ socket, enabled, micStream, onError }) {
  const [peers, setPeers] = useState([])
  const [streams, setStreams] = useState({})
  const [joined, setJoined] = useState(null)
  const [rejected, setRejected] = useState(null)
  const socketRef = useRef(null)
  const meshRef = useRef(null)

  // Held in a ref so a caller passing an inline function - which is every
  // caller - does not tear the call down on each render.
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onErrorRef.current = onError
  })

  const ready = Boolean(enabled && socket && micStream)
  const status = !ready ? 'idle' : rejected ? 'rejected' : joined ? 'live' : 'joining'

  const setMuted = useCallback((muted) => {
    meshRef.current?.setMuted(muted)
    socketRef.current?.emit('voice:state', { muted: Boolean(muted) })
  }, [])

  useEffect(() => {
    if (!ready) return

    let active = true
    socketRef.current = socket

    // The list of peers lives here rather than in React state, because two
    // things race to populate it: the join ack, which names everyone already on
    // the call, and peer-joined broadcasts, which can arrive first. Merging into
    // one map means neither can clobber the other - an earlier version replaced
    // the whole list on ack and silently dropped anyone already known.
    const known = new Map()
    const publish = () => setPeers([...known.values()])

    const remember = (peer) => {
      if (peer.socketId === socket.id) return
      known.set(peer.socketId, { ...known.get(peer.socketId), ...peer })
      publish()
    }

    // Connects to everyone known but not yet linked. Called after every change,
    // and again once the mesh exists, so a peer learned before the mesh was
    // ready is still picked up. connect() is idempotent by design.
    const linkAll = () => {
      const mesh = meshRef.current
      if (!mesh) return
      // The one place the "who offers" rule is applied. Both sides run it and
      // reach opposite conclusions, which is the entire point.
      for (const peerId of known.keys()) {
        mesh.connect(peerId, { initiator: socket.id < peerId })
      }
    }

    const onPeerJoined = (peer) => {
      // The server broadcasts to the whole room, so news about ourselves is
      // always ignored.
      if (!active || peer.socketId === socket.id) return
      remember(peer)
      linkAll()
    }

    const onPeerLeft = ({ socketId }) => {
      if (!active || socketId === socket.id) return
      meshRef.current?.disconnect(socketId)
      known.delete(socketId)
      publish()
      setStreams((prev) => {
        if (!prev[socketId]) return prev
        const next = { ...prev }
        delete next[socketId]
        return next
      })
    }

    const onPeerState = ({ socketId, muted }) => {
      if (!active || !known.has(socketId)) return
      remember({ socketId, muted })
    }

    const onSignalArrived = (payload) => {
      if (!active) return
      meshRef.current?.accept(payload)
    }

    socket.on('voice:peer-joined', onPeerJoined)
    socket.on('voice:peer-left', onPeerLeft)
    socket.on('voice:peer-state', onPeerState)
    socket.on('voice:signal', onSignalArrived)

    // Announce ourselves only once the mesh can answer. Nobody can signal us
    // before we join - they have not been told we exist - so this ordering is
    // what removes any need to queue early arrivals.
    getRtcConfig().then((config) => {
      if (!active) return

      meshRef.current = createVoiceMesh({
        config,
        localStream: micStream,
        sendSignal: (to, kind, data) => socket.emit('voice:signal', { to, kind, data }),
        onStream: (peerId, stream) => {
          if (active) setStreams((prev) => ({ ...prev, [peerId]: stream }))
        },
        onState: (peerId, connection) => {
          if (!active || !known.has(peerId)) return
          remember({ socketId: peerId, connection })
        },
      })

      // A peer-joined broadcast may already have arrived while the config was
      // being fetched, and could not be linked without a mesh. Now it can.
      linkAll()

      socket.emit('voice:join', (res) => {
        if (!active) return
        if (!res?.ok) {
          const message = res?.error || 'Could not join voice'
          setRejected(message)
          onErrorRef.current?.(message)
          return
        }
        setJoined({ selfId: res.self })
        // Everyone already on the call when we arrived. Merged, not assigned:
        // this list can be a moment out of date by the time it reaches us.
        for (const peer of res.peers || []) remember(peer)
        linkAll()
      })
    })

    return () => {
      active = false
      socket.off('voice:peer-joined', onPeerJoined)
      socket.off('voice:peer-left', onPeerLeft)
      socket.off('voice:peer-state', onPeerState)
      socket.off('voice:signal', onSignalArrived)
      // Harmless if the socket is already closing; the server's disconnect
      // handler is what actually guarantees the room finds out.
      socket.emit('voice:leave')
      meshRef.current?.destroy()
      meshRef.current = null
      socketRef.current = null
      setPeers([])
      setStreams({})
      setJoined(null)
      setRejected(null)
    }
  }, [ready, socket, micStream])

  // A window onto the call. __voice.peers shows the state of each leg;
  // await __voice.stats() shows the route each one actually took.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__voice = {
      selfId: joined?.selfId ?? null,
      peers,
      streams,
      status,
      stats: () => meshRef.current?.stats() ?? Promise.resolve({}),
    }
  }, [joined, peers, streams, status])

  return {
    peers,
    streams,
    selfId: joined?.selfId ?? null,
    status,
    error: rejected,
    setMuted,
  }
}
