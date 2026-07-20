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
import { CODE_SNIPPETS } from '../constants.js'
import { joinRoom, saveRoom } from '../lib/roomsApi.js'

// File extension shown in the editor header strip.
const EXT = { cpp: 'cpp', javascript: 'js', python: 'py', java: 'java' }

// roomId present -> collab room (loads/saves code + presence). Absent -> plain compiler.
const CodeEditor = ({ roomId }) => {
  const isCollab = Boolean(roomId)
  const editorRef = useRef(null)
  const [value, setValue] = useState(CODE_SNIPPETS.cpp)
  const [language, setLanguage] = useState('cpp')
  const [saving, setSaving] = useState(false)
  const [caution, setCaution] = useState(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  // Local mic drives the current user's avatar; only run it inside a room.
  const { level: micLevel, status: micStatus } = useMicLevel(isCollab)

  // Me (real) + placeholder teammates filling the 3-seat room until sockets land.
  const users = useMemo(
    () => [
      { id: 'me', name: user?.name || 'You', self: true },
      { id: 'seat-1', name: 'Teammate' },
      { id: 'seat-2', name: 'Guest' },
    ],
    [user],
  )

  const onMount = (editor) => {
    editorRef.current = editor
    editor.focus()
  }

  // True when the editor holds work that a template swap would throw away.
  const hasWork = () => value.trim() !== '' && value !== CODE_SNIPPETS[language]

  // Switch language -> load its starter. Warn first if real code would be lost.
  const onSelect = (lang) => {
    if (lang === language) return
    const apply = () => {
      setLanguage(lang)
      setValue(CODE_SNIPPETS[lang])
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
      setValue(CODE_SNIPPETS[language])
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

  // Collab room: join (creates it if new) and load its saved code.
  useEffect(() => {
    if (!isCollab) return
    let active = true
    joinRoom(roomId)
      .then((room) => {
        if (!active) return
        setLanguage(room.language || 'cpp')
        setValue(room.code ?? '')
      })
      .catch((err) => {
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

  const onSave = async () => {
    try {
      setSaving(true)
      await saveRoom(roomId, { code: value, language })
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
                {isCollab && <Box as="span">shared</Box>}
              </Box>
            </Box>
            <Box height={{ base: '48vh', md: '68vh' }}>
              <Editor
                height="100%"
                theme="vs-dark"
                language={language}
                value={value}
                onChange={(v) => setValue(v)}
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
        <Output editorRef={editorRef} language={language} />
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
