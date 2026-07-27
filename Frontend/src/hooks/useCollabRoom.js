// Everything the browser needs to be a member of a room.
//
// Owns one Y.Doc, one socket and one awareness instance for as long as the room
// is open, and hands the editor component four things:
//   attachEditor  - binds Monaco to the shared text
//   language      - the room's language (shared, not per-person)
//   members       - who is here, with the colours their cursors use
//   run           - the room-wide run: who started it and what it printed
//
// Everything is created and destroyed inside one effect, so leaving the page
// closes the socket, retires this user's cursor and frees the document.

import { useCallback, useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness'
import { MonacoBinding } from 'y-monaco'
import { createSocket } from '../lib/socket.js'
import { createCursorStyles } from '../lib/remoteCursors.js'
import { colorFor } from '../lib/userColor.js'
import monaco from '../lib/monacoSetup.js'

const IDLE_RUN = { busy: false, by: null, name: null, result: null }

// How long a peer's caret stays on screen after their last real move, and how
// often we re-check who has gone quiet.
const CURSOR_IDLE_MS = 2000
const CURSOR_TICK_MS = 500

export function useCollabRoom({ roomId, user, enabled }) {
  const [status, setStatus] = useState('idle')
  const [members, setMembers] = useState([])
  const [language, setLanguage] = useState(null)
  const [run, setRun] = useState(IDLE_RUN)

  // Refs, not state: these are external objects React only needs to reach, and
  // publishing them through setState would re-render the editor for no reason.
  const editorRef = useRef(null)
  const bindRef = useRef(null)
  const docRef = useRef(null)
  const textRef = useRef(null)
  const metaRef = useRef(null)
  const socketRef = useRef(null)

  // Monaco can mount before or after the socket connects, so whoever is second
  // triggers the binding.
  const attachEditor = useCallback((editor) => {
    editorRef.current = editor
    if (bindRef.current) bindRef.current(editor)
  }, [])

  const getCode = useCallback(() => textRef.current?.toString() ?? '', [])

  // Replace the whole document in one transaction, so remote peers see a single
  // atomic change instead of a delete followed by an insert.
  const setCode = useCallback((next) => {
    const doc = docRef.current
    const text = textRef.current
    if (!doc || !text) return
    doc.transact(() => {
      text.delete(0, text.length)
      text.insert(0, next)
    })
  }, [])

  // Language + starter template travel together, otherwise a peer could briefly
  // see Python code highlighted as C++.
  const applyLanguage = useCallback((nextLanguage, template) => {
    const doc = docRef.current
    const text = textRef.current
    const meta = metaRef.current
    if (!doc || !meta) return false

    doc.transact(() => {
      meta.set('language', nextLanguage)
      if (typeof template === 'string') {
        text.delete(0, text.length)
        text.insert(0, template)
      }
    })
    return true
  }, [])

  // Asks the server to run the room's code. The server uses its own copy of the
  // document, so what runs is exactly what everyone can see.
  const startRun = useCallback(
    (input) =>
      new Promise((resolve) => {
        const socket = socketRef.current
        if (!socket) return resolve({ ok: false, error: 'Not connected to the room' })
        socket.emit('run:start', { input }, (res) => resolve(res || { ok: false, error: 'No response' }))
      }),
    [],
  )

  useEffect(() => {
    if (!enabled || !roomId || !user) return

    let active = true
    let binding = null

    const doc = new Y.Doc()
    const text = doc.getText('monaco')
    const meta = doc.getMap('meta')
    const awareness = new Awareness(doc)
    const cursorStyles = createCursorStyles()
    const socket = createSocket()

    docRef.current = doc
    textRef.current = text
    metaRef.current = meta
    socketRef.current = socket

    const self = {
      id: user.id ?? user.email ?? 'me',
      name: user.name || user.email || 'You',
      color: colorFor(user.id ?? user.email ?? 'me'),
    }

    const bind = (editor) => {
      const model = editor?.getModel()
      if (!model) return
      if (binding) binding.destroy()

      // Every editor in the room must agree that a newline is exactly one
      // character. Monaco silently rewrites text it is given to whatever line
      // ending the model uses, but the Y.Text keeps the original. If one editor
      // stores "\r\n" and another "\n", the two disagree about every offset
      // after the first newline and edits start landing in the wrong place.
      model.setEOL(monaco.editor.EndOfLineSequence.LF)

      binding = new MonacoBinding(text, model, new Set([editor]), awareness)

      // Dev-only tripwire: if the editor and the document ever disagree about
      // their length, the offsets have drifted and edits will start misplacing.
      if (import.meta.env.DEV) {
        text.observe(() => {
          const editorLength = model.getValue().length
          if (editorLength !== text.length) {
            console.warn(
              `[codeforge] editor/document drift: editor=${editorLength} doc=${text.length}`,
            )
          }
        })
      }
    }

    // When each peer was last active, so a caret can be hidden once its owner
    // goes quiet. Activity means either of two things, and both count:
    //   - their selection moved  (an awareness message)
    //   - they changed the code  (a doc:update message)
    // Those arrive separately, so watching only the first would let a keystroke
    // show up before the caret that produced it.
    const lastMoved = new Map()
    let paintedCursors = ''

    const markActive = (clientId) => {
      const seen = lastMoved.get(clientId)
      lastMoved.set(clientId, { position: seen?.position ?? null, at: Date.now() })
    }

    const paintCursors = () => {
      if (!active) return

      const now = Date.now()
      const visible = []
      const present = new Set()

      awareness.getStates().forEach((state, clientId) => {
        if (clientId === doc.clientID || !state.user) return
        present.add(clientId)

        const position = JSON.stringify(state.selection ?? null)
        const seen = lastMoved.get(clientId)

        // Awareness re-announces an unchanged state every 15s to prove the peer
        // is alive. That is a heartbeat, not a movement, so only a genuinely
        // different selection counts as activity.
        if (!seen || seen.position !== position) {
          lastMoved.set(clientId, { position, at: now })
        }

        if (now - lastMoved.get(clientId).at <= CURSOR_IDLE_MS) {
          visible.push({ clientId, name: state.user.name, color: state.user.color })
        }
      })

      for (const clientId of lastMoved.keys()) {
        if (!present.has(clientId)) lastMoved.delete(clientId)
      }

      // y-monaco's decoration classes carry no styling of their own, so a peer
      // left out of this list simply stops being drawn - caret, label and all.
      const signature = visible.map((c) => `${c.clientId}:${c.color}`).join('|')
      if (signature === paintedCursors) return
      paintedCursors = signature
      cursorStyles.update(visible)
    }

    // Awareness changed: refresh the avatar list, then the carets.
    const readPeers = () => {
      if (!active) return

      const byUser = new Map()

      awareness.getStates().forEach((state, clientId) => {
        const peer = state.user
        if (!peer) return

        const isSelf = clientId === doc.clientID

        // Two tabs of the same person are one member with one avatar.
        const key = peer.id ?? clientId
        const existing = byUser.get(key)
        if (existing) {
          existing.self = existing.self || isSelf
          return
        }
        byUser.set(key, { id: key, clientId, name: peer.name, color: peer.color, self: isSelf })
      })

      setMembers([...byUser.values()])
      paintCursors()
    }

    // A remote edit landed: show its author's caret in the same tick the text
    // appears. Yjs tells us who wrote it - every client whose clock advanced
    // during this transaction contributed to it.
    const onRemoteEdit = (transaction) => {
      if (!active || transaction.origin !== 'remote') return

      let touched = false
      transaction.afterState.forEach((clock, clientId) => {
        if (clientId === doc.clientID) return
        if ((transaction.beforeState.get(clientId) ?? 0) < clock) {
          markActive(clientId)
          touched = true
        }
      })

      if (touched) paintCursors()
    }

    // Hiding needs a clock of its own: nothing arrives from a peer who has
    // simply stopped moving.
    const cursorTimer = setInterval(paintCursors, CURSOR_TICK_MS)

    const readMeta = () => {
      if (active) setLanguage(meta.get('language') || null)
    }

    const onLocalAwareness = ({ added, updated, removed }, origin) => {
      if (origin === 'remote') return
      const changed = added.concat(updated, removed)
      if (changed.length === 0) return
      socket.emit('awareness:update', {
        clientId: doc.clientID,
        update: encodeAwarenessUpdate(awareness, changed),
      })
    }

    // 'remote' marks anything that arrived from the server; re-sending it would
    // bounce the same edit around the room forever.
    const onLocalDocUpdate = (update, origin) => {
      if (origin === 'remote') return
      socket.emit('doc:update', update)
    }

    awareness.setLocalStateField('user', self)
    awareness.on('update', onLocalAwareness)
    awareness.on('change', readPeers)
    doc.on('update', onLocalDocUpdate)
    doc.on('afterTransaction', onRemoteEdit)
    meta.observe(readMeta)

    // Runs again automatically after a dropped connection, which is what makes
    // reconnects resync instead of silently drifting.
    socket.on('connect', () => {
      if (!active) return
      setStatus('joining')

      socket.emit('room:join', roomId, (joined) => {
        if (!active) return
        if (!joined?.ok) {
          setStatus('rejected')
          return
        }

        // Send what we have, receive only what we are missing.
        socket.emit('doc:sync', Y.encodeStateVector(doc), (sync) => {
          if (!active) return
          if (!sync?.ok) {
            setStatus('error')
            return
          }

          Y.applyUpdate(doc, new Uint8Array(sync.update), 'remote')
          if (sync.awareness) {
            applyAwarenessUpdate(awareness, new Uint8Array(sync.awareness), 'remote')
          }

          // Now the other direction: anything the server hasn't seen yet.
          const missing = Y.encodeStateAsUpdate(doc, new Uint8Array(sync.stateVector))
          socket.emit('doc:update', missing)
          socket.emit('awareness:update', {
            clientId: doc.clientID,
            update: encodeAwarenessUpdate(awareness, [doc.clientID]),
          })

          setStatus('live')
          readMeta()
          readPeers()
        })
      })
    })

    socket.on('doc:update', (update) => {
      Y.applyUpdate(doc, new Uint8Array(update), 'remote')
    })

    socket.on('awareness:update', (update) => {
      applyAwarenessUpdate(awareness, new Uint8Array(update), 'remote')
    })

    socket.on('awareness:remove', (clientId) => {
      removeAwarenessStates(awareness, [clientId], 'remote')
    })

    socket.on('run:started', ({ by, name }) => {
      if (active) setRun({ busy: true, by, name, result: null })
    })

    socket.on('run:output', (result) => {
      if (active) setRun((prev) => ({ ...prev, busy: false, result }))
    })

    socket.on('run:idle', () => {
      if (active) setRun((prev) => ({ ...prev, busy: false }))
    })

    socket.on('disconnect', () => {
      if (active) setStatus('offline')
    })

    socket.on('connect_error', (err) => {
      if (active) setStatus(err.message === 'UNAUTHORIZED' ? 'unauthorized' : 'error')
    })

    bindRef.current = bind
    if (editorRef.current) bind(editorRef.current)

    return () => {
      active = false
      clearInterval(cursorTimer)
      bindRef.current = null
      if (binding) binding.destroy()
      doc.off('update', onLocalDocUpdate)
      doc.off('afterTransaction', onRemoteEdit)
      awareness.off('update', onLocalAwareness)
      awareness.off('change', readPeers)
      meta.unobserve(readMeta)
      removeAwarenessStates(awareness, [doc.clientID], 'local')
      awareness.destroy()
      socket.close()
      doc.destroy()
      cursorStyles.destroy()
      docRef.current = null
      textRef.current = null
      metaRef.current = null
      socketRef.current = null
    }
  }, [enabled, roomId, user?.id, user?.name, user?.email])

  return { attachEditor, getCode, setCode, applyLanguage, startRun, status, members, language, run }
}
