import Editor from '@monaco-editor/react'
import { useState, useRef } from 'react'
import { Box, Stack } from '@chakra-ui/react'
import LanguageSelector from './LanguageSelector.jsx'
import { CODE_SNIPPETS } from '../constants.js'
import Output from './Output.jsx'

const CodeEditor = () => {
  const editorRef = useRef(null)
  const [value, setValue] = useState(CODE_SNIPPETS.cpp)
  const [language, setLanguage] = useState('cpp')

  const onMount = (editor) => {
    editorRef.current = editor
    editor.focus()
  }

  const onSelect = (lang) => {
    setLanguage(lang)
    setValue(CODE_SNIPPETS[lang])
  }

  return (
    <Stack direction={{ base: 'column', md: 'row' }} gap={4} align="stretch">
      <Box w={{ base: '100%', md: '50%' }}>
        <LanguageSelector language={language} onSelect={onSelect} />
        <Box
          height={{ base: '50vh', md: '75vh' }}
          border="1px solid"
          borderColor="gray.700"
          borderRadius={4}
          overflow="hidden"
        >
          <Editor
            height="100%"
            theme="vs-dark"
            language={language}
            value={value}
            onChange={(value) => setValue(value)}
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
  )
}

export default CodeEditor
