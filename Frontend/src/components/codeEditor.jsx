import Editor from '@monaco-editor/react'
import { useState, useRef } from 'react'
import { Box, HStack } from '@chakra-ui/react'
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
    <Box>
      <HStack>
        <Box w="50%">
          <LanguageSelector language={language} onSelect={onSelect} />
          <Editor
            height="75vh"
            theme="vs-dark"
            language={language}
            value={value}
            onChange={(value) => setValue(value)}
            onMount={onMount}
          />
        </Box>
        <Output editorRef={editorRef} language={language} code={value} />
      </HStack>

    </Box>
  )
}

export default CodeEditor
