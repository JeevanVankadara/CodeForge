import { Box, Text, Button, Textarea } from '@chakra-ui/react'
import { useState } from 'react'
import { toast, Bounce } from 'react-toastify'
import { executeCode } from '../api.js'

const Output = ({ editorRef, language }) => {
  const [input, setInput] = useState('')
  const [stdout, setStdout] = useState('')
  const [stderr, setStderr] = useState('')
  const [hasRun, setHasRun] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const notifyError = (message) => {
    toast.error(message, {
      position: 'top-center',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: false,
      progress: undefined,
      theme: 'dark',
      transition: Bounce,
    })
  }

  const runCode = async () => {
    const sourceCode = editorRef.current?.getValue()

    if (!sourceCode?.trim()) {
      notifyError('Please enter some code to execute.')
      return
    }

    try {
      setIsLoading(true)
      const result = await executeCode(language, sourceCode, input)
      setStdout(result.stdout)
      setStderr(result.stderr)
      setHasRun(true)
    } catch (err) {
      notifyError(err.response?.data?.message || err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box w={{ base: '100%', md: '50%' }}>
      {/* Run button */}
      <Button
        mb={4}
        onClick={runCode}
        loading={isLoading}
        bg="#3b82f6"
        color="white"
        _hover={{ bg: '#2563eb' }}
        _active={{ bg: '#1d4ed8' }}
      >
        Run
      </Button>

      {/* Input box (stdin) — scrolls when the text is longer than the box */}
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter Input here"
        height="140px"
        resize="none"
        overflowY="auto"
        fontFamily="mono"
        fontSize="sm"
        bg="#0b0b0e"
        color="#e6e6ea"
        border="1px solid"
        borderColor="#1e1e22"
        borderRadius={8}
        _placeholder={{ color: '#8a8a93' }}
        _focus={{ borderColor: '#3b82f6', boxShadow: 'none' }}
      />

      {/* Helper line */}
      <Box
        mt={3}
        mb={4}
        p={3}
        bg="#111114"
        border="1px solid"
        borderColor="#1e1e22"
        borderRadius={8}
      >
        <Text fontSize="sm" color="#8a8a93">
          If your code takes input, add it in the above box before running.
        </Text>
      </Box>

      {/* Output heading */}
      <Text mb={2} fontSize="lg" fontWeight="semibold" color="#e6e6ea">
        Output
      </Text>

      {/* Output console — scrolls when the output is longer than the box.
          stdout lines are light, stderr lines are red. */}
      <Box
        height={{ base: '40vh', md: '45vh' }}
        p={3}
        overflow="auto"
        fontFamily="mono"
        fontSize="sm"
        bg="#0b0b0e"
        border="1px solid"
        borderRadius={8}
        borderColor={stderr ? '#ef4444' : '#1e1e22'}
      >
        {hasRun ? (
          <>
            {stdout.split('\n').map((line, index) => (
              <Text key={`out-${index}`} color="#c9c9d0">
                {line}
              </Text>
            ))}
            {stderr.split('\n').map((line, index) => (
              <Text key={`err-${index}`} color="#f87171">
                {line}
              </Text>
            ))}
          </>
        ) : (
          <Text color="#8a8a93">Click "Run" to see the output here</Text>
        )}
      </Box>
    </Box>
  )
}

export default Output
