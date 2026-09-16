import Editor from '@monaco-editor/react'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box } from '@chakra-ui/react'
import { RotateCcw } from 'lucide-react'
import { toast } from 'react-toastify'
import EditorBar from './EditorBar.jsx'
import ProblemPanel from './ProblemPanel.jsx'
import TestPanel from './TestPanel.jsx'
import PeerAudio from './CollabRoomComponents/PeerAudio.jsx'
import { useRun } from '../hooks/useRun.js'
import { useSplit } from '../hooks/useSplit.js'
import { allAccepted } from '../lib/verdict.js'
import { getProblem } from '../lib/problemsApi.js'
import { useMicStream } from '../hooks/useMicStream.js'
import { useAudioLevels } from '../hooks/useAudioLevels.js'
import { useVoiceRoom } from '../hooks/useVoiceRoom.js'
import { Caution } from './site/Caution.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useCollabRoom } from '../hooks/useCollabRoom.js'
import { CODE_SNIPPETS } from '../constants.js'
import { joinRoom, saveRoom } from '../lib/roomsApi.js'
import { colorFor } from '../lib/userColor.js'
import '../lib/monacoSetup.js'

// File extension shown in the editor header strip.
const EXT = { cpp: 'cpp', java: 'java', python: 'py' }

const STATUS_HINT = {
  idle: 'offline',
  joining: 'joining…',
  live: 'shared',
  offline: 'reconnecting…',
  rejected: 'room full',
  unauthorized: 'signed out',
  error: 'sync failed',
}

// roomId present -> collab room (loads/saves code + presence). Absent -> plain compiler.
//
// The two modes differ in where the truth lives. In a room the Y.Doc owns the
// code and the language, Monaco is uncontrolled, and Run happens on the server
// for everyone. On the compiler page it is all local React state.
const CodeEditor = ({ roomId }) => {
  const isCollab = Boolean(roomId)
  const editorRef = useRef(null)
  const [value, setValue] = useState(CODE_SNIPPETS.cpp)
  const [localLanguage, setLocalLanguage] = useState('cpp')
  const [saving, setSaving] = useState(false)
  const [caution, setCaution] = useState(null)
  // Which room the user turned voice on for - not a plain boolean, so walking
  // into a different room drops the mic without anything having to notice.
  const [voiceRoomId, setVoiceRoomId] = useState(null)
  // Sticky across leaving and rejoining the call: someone who muted themselves
  // meant it, and should not be reopened by a reconnect.
  const [micMuted, setMicMuted] = useState(false)
  const [problem, setProblem] = useState(null)
  const [caseIndex, setCaseIndex] = useState(0)
  const [cases, setCases] = useState([{ input: '', expected: null }])
  const [testView, setTestView] = useState({ tab: 'case', open: true })
  const [loadingProblem, setLoadingProblem] = useState(false)
  const loadingRef = useRef(null)
  const appliedRef = useRef(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  const fetchProblem = async (id) => {
    if (loadingRef.current === id) return null
    loadingRef.current = id
    try {
      return await getProblem(id)
    } finally {
      loadingRef.current = null
    }
  }

  const applyProblem = (next) => {
    appliedRef.current = next.id
    setProblem(next)
    setCases(next.samples.map((s) => ({ input: s.input, expected: s.output })))
    setCaseIndex(0)
    runner.clear()
  }

  const onSharedProblem = (id) => {
    if (!id || id === appliedRef.current) return
    fetchProblem(id)
      .then((next) => next && applyProblem(next))
      .catch(() => {})
  }

  const {
    attachEditor,
    getCode,
    setCode,
    applyLanguage,
    setProblemId,
    startRun,
    status,
    members,
    language: sharedLanguage,
    run,
    socket,
  } = useCollabRoom({ roomId, user, enabled: isCollab, onProblemChange: onSharedProblem })

  // In a room the language is part of the shared document, so everyone's editor
  // highlights the same way. 'cpp' covers the moment before the first sync.
  const language = isCollab ? (sharedLanguage ?? 'cpp') : localLanguage

  // Voice is opt-in: nothing touches the microphone until the user asks for it,
  // so simply opening a room no longer raises a permission prompt.
  const voiceOn = isCollab && voiceRoomId === roomId
  const { stream: micStream, status: micStatus } = useMicStream(voiceOn)

  const toggleVoice = () => setVoiceRoomId((current) => (current === roomId ? null : roomId))

  // Voice rides on the room's own socket, so it waits for that socket to be in
  // the room - and for the mic, since a connection is built around the track it
  // is going to carry.
  const voice = useVoiceRoom({
    socket,
    micStream,
    enabled: voiceOn && status === 'live' && micStatus === 'live',
    onError: (message) => {
      // Refused - most likely this user already has voice open in another tab.
      // Drop back out rather than leave the mic running for nothing.
      toast.error(message, { theme: 'dark' })
      setVoiceRoomId(null)
    },
  })

  // Our own mic alongside every peer's audio, measured together by one meter.
  const voiceStreams = useMemo(
    () => (micStream ? { self: micStream, ...voice.streams } : voice.streams),
    [micStream, voice.streams],
  )
  const levels = useAudioLevels(voiceStreams)

  // Applied whenever the mute setting changes, and again after every (re)join:
  // a rebuilt call may be carrying a brand new microphone track, and a new track
  // always starts unmuted.
  const { setMuted: applyMuted, status: voiceStatus } = voice
  useEffect(() => {
    applyMuted(micMuted)
  }, [micMuted, applyMuted, voiceStatus])

  // Room membership and call membership are different lists - being in a room
  // does not put you on the call - so they are joined here for display.
  //
  // Matched on user id rather than socket id, which is safe precisely because
  // the server allows each user only one voice tab: the mapping is one to one.
  const users = useMemo(() => {
    const base =
      members.length > 0
        ? members
        : [
            {
              id: user?.id ?? user?.email ?? 'me',
              name: user?.name || 'You',
              color: colorFor(user?.id ?? user?.email ?? 'me'),
              self: true,
            },
          ]

    const onCall = new Map(voice.peers.map((p) => [String(p.userId), p]))

    return base.map((member) => {
      if (member.self) {
        return {
          ...member,
          onCall: voice.status === 'live',
          muted: micMuted,
          level: levels.self ?? 0,
        }
      }
      const peer = onCall.get(String(member.id))
      return {
        ...member,
        onCall: Boolean(peer),
        muted: Boolean(peer?.muted),
        level: peer ? (levels[peer.socketId] ?? 0) : 0,
      }
    })
  }, [members, user, voice.peers, voice.status, levels, micMuted])

  const onMount = (editor) => {
    editorRef.current = editor
    if (isCollab) attachEditor(editor)
    editor.focus()
  }

  const readCode = () => (isCollab ? getCode() : value)

  const writeCode = (next) => {
    if (isCollab) setCode(next)
    else setValue(next)
  }

  // True when the editor holds work that a template swap would throw away.
  const hasWork = () => {
    const code = readCode()
    return code.trim() !== '' && code !== CODE_SNIPPETS[language]
  }

  // Switch language -> load its starter. Warn first if real code would be lost.
  // In a room this changes the language for everybody, in one atomic edit.
  const onSelect = (lang) => {
    if (lang === language) return
    const apply = () => {
      if (isCollab) applyLanguage(lang, CODE_SNIPPETS[lang])
      else {
        setLocalLanguage(lang)
        setValue(CODE_SNIPPETS[lang])
      }
      setCaution(null)
    }
    if (!hasWork()) return apply()
    setCaution({
      title: 'Switch language?',
      message: `Switching to ${lang} replaces your current code with the ${lang} starter template. This can't be undone.`,
      confirmLabel: 'Switch & reset',
      onConfirm: apply,
    })
  }

  // Reset the editor back to the current language's starter, warning first.
  const onReset = () => {
    const apply = () => {
      writeCode(CODE_SNIPPETS[language])
      setCaution(null)
    }
    if (!hasWork()) return apply()
    setCaution({
      title: 'Reset code?',
      message: `This replaces your code with the ${language} starter template. This can't be undone.`,
      confirmLabel: 'Reset',
      onConfirm: apply,
    })
  }

  // Collab room: claim a seat over HTTP. This is also what produces a clean 401
  // redirect for a signed-out visitor; the code and language arrive over the
  // socket, so nothing from this response is written into the editor.
  useEffect(() => {
    if (!isCollab) return
    let active = true
    joinRoom(roomId).catch((err) => {
      if (!active) return
      if (err.response?.status === 401) {
        toast.error('Please log in to open a room', { theme: 'dark' })
        navigate('/login')
      } else {
        toast.error(err.response?.data?.error || 'Could not open room', {
          theme: 'dark',
        })
      }
    })
    return () => {
      active = false
    }
  }, [roomId])

  useEffect(() => {
    if (status === 'rejected') {
      toast.error('Maximum size of room is reached', { theme: 'dark' })
    }
    if (status === 'unauthorized') {
      toast.error('Please log in to open a room', { theme: 'dark' })
      navigate('/login')
    }
  }, [status])

  // Handed to Output only inside a room. Its presence is what switches the Run
  // button from "run my copy over HTTP" to "run the room's code for everyone".
  const sharedRun = useMemo(() => {
    if (!isCollab) return null
    const runner = members.find((m) => m.id === run.by)
    return {
      busy: run.busy,
      isSelf: Boolean(runner?.self),
      runnerName: runner?.name || run.name || 'Someone',
      result: run.result,
      start: startRun,
    }
  }, [isCollab, run, members, startRun])

  const runner = useRun({ editorRef, language, sharedRun })
  const { split, containerRef, startDrag } = useSplit()

  const passedAll = useMemo(() => allAccepted(cases, runner.results), [cases, runner.results])
  useEffect(() => {
    if (!passedAll || !problem) return
    toast.success(
      <span>
        All sample tests passed.{' '}
        <a href={problem.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>
          Go and submit the question on the official Codeforces website
        </a>
      </span>,
      { theme: 'dark', autoClose: 10000 },
    )
  }, [passedAll, problem])

  const onLoadProblem = async (id) => {
    if (!id.trim()) return
    try {
      setLoadingProblem(true)
      const next = await fetchProblem(id)
      if (!next) return
      applyProblem(next)
      if (isCollab) setProblemId(next.id)
    } catch (err) {
      const status = err.response?.status
      if (status === 401) toast.error('Please log in to load problems', { theme: 'dark' })
      else toast.error(err.response?.data?.error || 'Could not load the problem', { theme: 'dark' })
    } finally {
      setLoadingProblem(false)
    }
  }

  const setInput = (text) =>
    setCases((prev) => prev.map((c, i) => (i === caseIndex ? { ...c, input: text } : c)))

  const addCase = () => {
    setCases((prev) => [...prev, { input: '', expected: null }])
    setCaseIndex(cases.length)
  }

  const onRun = () => {
    setTestView({ tab: 'result', open: true })
    runner.run(cases.map((c) => c.input))
  }

  const onSave = async () => {
    try {
      setSaving(true)
      await saveRoom(roomId, { code: readCode(), language })
      toast.success('Saved', { theme: 'dark' })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed', {
        theme: 'dark',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      gap={3}
      h={{ base: 'auto', lg: 'calc(100vh - 24px)' }}
    >
      <EditorBar
        roomId={roomId}
        language={language}
        onSelectLanguage={onSelect}
        problemId={problem?.id}
        onLoadProblem={onLoadProblem}
        loadingProblem={loadingProblem}
        onRun={onRun}
        running={runner.isLoading}
        runLabel={
          sharedRun?.busy && !sharedRun.isSelf ? `${sharedRun.runnerName} is running…` : undefined
        }
        room={
          isCollab
            ? {
                onSave,
                saving,
                presence: {
                  users,
                  micStatus,
                  voiceOn,
                  voicePeers: voice.peers,
                  muted: micMuted,
                  onToggleVoice: toggleVoice,
                  onToggleMute: () => setMicMuted((m) => !m),
                },
              }
            : null
        }
      />

      <Box
        ref={containerRef}
        display="flex"
        flexDirection={{ base: 'column', lg: 'row' }}
        gap={{ base: 3, lg: 0 }}
        flex="1"
        minH={0}
      >
        <Box w={{ base: '100%', lg: `${split}%` }} h={{ base: '45vh', lg: 'auto' }} minH={0} flexShrink={0}>
          <ProblemPanel problem={problem} />
        </Box>

        <Box
          onPointerDown={startDrag}
          display={{ base: 'none', lg: 'flex' }}
          w="12px"
          flexShrink={0}
          alignItems="center"
          justifyContent="center"
          cursor="col-resize"
          role="separator"
          _hover={{ '& > div': { bg: '#3b82f6' } }}
        >
          <Box w="2px" h="40px" borderRadius="full" bg="#2a2a30" />
        </Box>

        <Box display="flex" flexDirection="column" gap={3} minH={0} minW={0} flex="1">
          <Box
            border="1px solid"
            borderColor="#1e1e22"
            borderRadius={12}
            overflow="hidden"
            bg="#0b0b0e"
            display="flex"
            flexDirection="column"
            flex="1"
            minH={{ base: '50vh', lg: 0 }}
          >
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              px={4}
              py={2}
              borderBottom="1px solid"
              borderColor="#1e1e22"
              fontFamily="mono"
              fontSize="11px"
              letterSpacing="0.14em"
              textTransform="uppercase"
              color="#8a8a93"
            >
              <Box as="span">
                <Box as="span" color="#3b82f6">
                  {language}
                </Box>
                <Box as="span" color="#5a5a63">
                  {' '}
                  / main.{EXT[language] || language}
                </Box>
              </Box>
              <Box display="flex" alignItems="center" gap={3}>
                <Box
                  as="button"
                  type="button"
                  onClick={onReset}
                  display="flex"
                  alignItems="center"
                  gap={1.5}
                  color="#8a8a93"
                  _hover={{ color: '#e6e6ea' }}
                >
                  <RotateCcw size={12} />
                  reset
                </Box>
                {isCollab && (
                  <Box as="span" color={status === 'live' ? '#10b981' : '#8a8a93'}>
                    {STATUS_HINT[status] || status}
                  </Box>
                )}
              </Box>
            </Box>
            <Box flex="1" minH={0}>
              <Editor
                height="100%"
                theme="vs-dark"
                language={language}
                value={isCollab ? undefined : value}
                onChange={isCollab ? undefined : (v) => setValue(v)}
                onMount={onMount}
                options={{
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 12, bottom: 12 },
                  // Soft fading blink + caret that glides between positions.
                  cursorBlinking: 'phase',
                  cursorSmoothCaretAnimation: 'on',
                  cursorWidth: 2,
                }}
              />
            </Box>
          </Box>

          <TestPanel
            cases={cases}
            caseIndex={caseIndex}
            onCaseChange={setCaseIndex}
            onInputChange={setInput}
            onAddCase={addCase}
            results={runner.results}
            isLoading={runner.isLoading}
            view={testView}
            onViewChange={setTestView}
          />
        </Box>
      </Box>

      {/* One hidden player per peer - this is what makes the call audible. */}
      {Object.entries(voice.streams).map(([socketId, stream]) => (
        <PeerAudio key={socketId} stream={stream} />
      ))}

      {/* Warns before a language switch or reset wipes written code. */}
      <Caution
        open={Boolean(caution)}
        title={caution?.title}
        message={caution?.message}
        confirmLabel={caution?.confirmLabel}
        onConfirm={caution?.onConfirm}
        onCancel={() => setCaution(null)}
      />
    </Box>
  )
}

export default CodeEditor
