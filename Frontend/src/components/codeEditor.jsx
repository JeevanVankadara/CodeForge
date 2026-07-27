import Editor from '@monaco-editor/react'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Stack } from '@chakra-ui/react'
import { RotateCcw } from 'lucide-react'
import { toast } from 'react-toastify'
import LanguageSelector from './LanguageSelector.jsx'
import Output from './Output.jsx'
import EditorTopBar from './EditorTopBar.jsx'
import RoomTopBar from './CollabRoomComponents/RoomTopBar.jsx'
import { useMicLevel } from './CollabRoomComponents/useMicLevel.js'
import { Caution } from './site/Caution.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useCollabRoom } from '../hooks/useCollabRoom.js'
import { CODE_SNIPPETS } from '../constants.js'
import { joinRoom, saveRoom } from '../lib/roomsApi.js'
import { colorFor } from '../lib/userColor.js'
import '../lib/monacoSetup.js'

// File extension shown in the editor header strip.
const EXT = { cpp: 'cpp', javascript: 'js', python: 'py', java: 'java' }

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
  const navigate = useNavigate()
  const { user } = useAuth()

  const {
    attachEditor,
    getCode,
    setCode,
    applyLanguage,
    startRun,
    status,
    members,
    language: sharedLanguage,
    run,
  } = useCollabRoom({ roomId, user, enabled: isCollab })

  // In a room the language is part of the shared document, so everyone's editor
  // highlights the same way. 'cpp' covers the moment before the first sync.
  const language = isCollab ? (sharedLanguage ?? 'cpp') : localLanguage

  // Local mic drives the current user's avatar; only run it inside a room.
  const { level: micLevel, status: micStatus } = useMicLevel(isCollab)

  const users = useMemo(() => {
    if (members.length > 0) return members
    const fallbackKey = user?.id ?? user?.email ?? 'me'
    return [
      {
        id: fallbackKey,
        name: user?.name || 'You',
        color: colorFor(fallbackKey),
        self: true,
      },
    ]
  }, [members, user])

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
    joinRoom(roomId)
      .catch((err) => {
        if (!active) return
        if (err.response?.status === 401) {
          toast.error('Please log in to open a room', { theme: 'dark' })
          navigate('/login')
        } else {
          toast.error(err.response?.data?.error || 'Could not open room', { theme: 'dark' })
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

  const onSave = async () => {
    try {
      setSaving(true)
      await saveRoom(roomId, { code: readCode(), language })
      toast.success('Saved', { theme: 'dark' })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed', { theme: 'dark' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box maxW="1400px" mx="auto">
      {isCollab ? (
        <RoomTopBar
          roomId={roomId}
          users={users}
          selfLevel={micLevel}
          micStatus={micStatus}
          onSave={onSave}
          saving={saving}
        />
      ) : (
        <EditorTopBar roomId={roomId} onSave={onSave} saving={saving} />
      )}

      <Stack direction={{ base: 'column', md: 'row' }} gap={5} align="stretch">
        <Box w={{ base: '100%', md: '50%' }}>
          <LanguageSelector language={language} onSelect={onSelect} />
          <Box
            border="1px solid"
            borderColor="#1e1e22"
            borderRadius={12}
            overflow="hidden"
            bg="#0b0b0e"
          >
            {/* Editor header strip: file name + a hint that this pane is shared. */}
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
                {/* Reset the editor to the current language's starter template. */}
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
            <Box height={{ base: '48vh', md: '68vh' }}>
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
        </Box>
        <Output editorRef={editorRef} language={language} sharedRun={sharedRun} />
      </Stack>

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
