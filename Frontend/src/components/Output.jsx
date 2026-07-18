import { Box, Text, Button, Textarea } from '@chakra-ui/react'
import { useState } from 'react'
import { toast, Bounce } from 'react-toastify'
import { executeCode } from '../api.js'

const Output = ({ editorRef, language }) => {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setError] = useState(false)

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
      setOutput(result.run.output.split('\n'))
      setError(Boolean(result.run.stderr))
    } catch (err) {
      setError(true)
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
        bg="blue.500"
        color="white"
        _hover={{ bg: 'blue.600' }}
        _active={{ bg: 'blue.700' }}
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
        bg="#110c1b"
        color="gray.200"
        border="1px solid"
        borderColor="gray.700"
        borderRadius={6}
        _placeholder={{ color: 'gray.500' }}
        _focus={{ borderColor: 'blue.400', boxShadow: 'none' }}
      />

      {/* Helper line */}
      <Box
        mt={3}
        mb={4}
        p={3}
        bg="#1a1625"
        borderRadius={6}
      >
        <Text fontSize="sm" color="gray.300">
          If your code takes input, add it in the above box before running.
        </Text>
      </Box>

      {/* Output heading */}
      <Text mb={2} fontSize="lg" fontWeight="semibold">
        Output
      </Text>

      {/* Output console — scrolls when the output is longer than the box */}
      <Box
        height={{ base: '40vh', md: '45vh' }}
        p={2}
        overflow="auto"
        fontFamily="mono"
        fontSize="sm"
        border="1px solid"
        borderRadius={6}
        color={isError ? 'red.400' : 'gray.300'}
        borderColor={isError ? 'red.500' : 'gray.700'}
      >
        {output ? (
          output.map((line, index) => <Text key={index}>{line}</Text>)
        ) : (
          <Text color="gray.500">Click "Run" to see the output here</Text>
        )}
      </Box>
    </Box>
  )
}

export default Output
