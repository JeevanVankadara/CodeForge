import { Box, Text, Button } from '@chakra-ui/react'
import { useState } from 'react'
import { toast, Bounce } from 'react-toastify'
import { executeCode } from '../api.js'

const Output = ({ editorRef, language }) => {
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
      const result = await executeCode(language, sourceCode)
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
      <Text mb={2} fontSize="lg">
        Output
      </Text>
      <Button
        variant="outline"
        mb={4}
        onClick={runCode}
        loading={isLoading}
        bg="#110c1b"
        color="green.300"
        borderColor="green.600"
        _hover={{ bg: "green.950", borderColor: "green.400", color: "green.200" }}
        _active={{ bg: "green.950" }}
      >
        Run Code
      </Button>
      <Box
        height={{ base: '50vh', md: '75vh' }}
        p={2}
        overflow="auto"
        fontFamily="mono"
        fontSize="sm"
        border="1px solid"
        borderRadius={4}
        color={isError ? 'red.400' : 'gray.300'}
        borderColor={isError ? 'red.500' : 'gray.700'}
      >
        {output ? (
          output.map((line, index) => <Text key={index}>{line}</Text>)
        ) : (
          <Text color="gray.500">Click "Run Code" to see the output here</Text>
        )}
      </Box>
    </Box>
  )
}

export default Output
