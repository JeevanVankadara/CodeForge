import Editor from '@monaco-editor/react'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Stack } from '@chakra-ui/react'
import { toast } from 'react-toastify'
import LanguageSelector from './LanguageSelector.jsx'
import Output from './Output.jsx'
import EditorTopBar from './EditorTopBar.jsx'
import { CODE_SNIPPETS } from '../constants.js'
import { joinRoom, saveRoom } from '../lib/roomsApi.js'

// roomId present -> collab room (loads/saves code). Absent -> plain compiler.
const CodeEditor = ({ roomId }) => {
  const isCollab = Boolean(roomId)
  const editorRef = useRef(null)
  const [value, setValue] = useState(CODE_SNIPPETS.cpp)
  const [language, setLanguage] = useState('cpp')
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  const onMount = (editor) => {
    editorRef.current = editor
    editor.focus()
  }

  const onSelect = (lang) => {
    setLanguage(lang)
    setValue(CODE_SNIPPETS[lang])
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
    <>
      <EditorTopBar roomId={roomId} onSave={onSave} saving={saving} />
      <Stack direction={{ base: 'column', md: 'row' }} gap={4} align="stretch">
        <Box w={{ base: '100%', md: '50%' }}>
          <LanguageSelector language={language} onSelect={onSelect} />
          <Box
            height={{ base: '50vh', md: '72vh' }}
            border="1px solid"
            borderColor="#1e1e22"
            borderRadius={8}
            overflow="hidden"
          >
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
              }}
            />
          </Box>
        </Box>
        <Output editorRef={editorRef} language={language} />
      </Stack>
    </>
  )
}

export default CodeEditor
