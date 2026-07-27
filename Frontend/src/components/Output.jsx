import { Box, Text, Button, Textarea } from '@chakra-ui/react'
import { useState } from 'react'
import { Play, Terminal } from 'lucide-react'
import { toast, Bounce } from 'react-toastify'
import { executeCode } from '../api.js'

// Small uppercase caption used on each console's header strip.
const PanelLabel = ({ children, color = '#8a8a93' }) => (
  <Text
    fontFamily="mono"
    fontSize="11px"
    letterSpacing="0.14em"
    textTransform="uppercase"
    color={color}
  >
    {children}
  </Text>
)

// sharedRun is passed only inside a room. When present, Run is a room-wide
// action: the server executes the shared document and every member receives the
// same output, so the local HTTP path below is skipped entirely.
const Output = ({ editorRef, language, sharedRun }) => {
  const shared = Boolean(sharedRun)

  const [input, setInput] = useState('')
  const [localStdout, setLocalStdout] = useState('')
  const [localStderr, setLocalStderr] = useState('')
  const [localHasRun, setLocalHasRun] = useState(false)
  const [localLoading, setLocalLoading] = useState(false)

  // In a room these come from the server broadcast instead of local state.
  const stdout = shared ? (sharedRun.result?.stdout ?? '') : localStdout
  const stderr = shared ? (sharedRun.result?.stderr ?? '') : localStderr
  const hasRun = shared ? Boolean(sharedRun.result) : localHasRun
  const isLoading = shared ? sharedRun.busy : localLoading

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
    // Room: ask the server to run the shared document. The code itself is never
    // sent - the server already has the authoritative copy.
    if (shared) {
      const res = await sharedRun.start(input)
      if (!res?.ok) notifyError(res?.error || 'Could not start the run')
      return
    }

    const sourceCode = editorRef.current?.getValue()

    if (!sourceCode?.trim()) {
      notifyError('Please enter some code to execute.')
      return
    }

    try {
      setLocalLoading(true)
      const result = await executeCode(language, sourceCode, input)
      setLocalStdout(result.stdout)
      setLocalStderr(result.stderr)
      setLocalHasRun(true)
    } catch (err) {
      notifyError(err.response?.data?.message || err.message)
    } finally {
      setLocalLoading(false)
    }
  }

  return (
    <Box w={{ base: '100%', md: '50%' }} display="flex" flexDirection="column" gap={4}>
      {/* Run action. In a room it is disabled while anyone is running. */}
      <Box display="flex" alignItems="center" gap={3}>
        <Button
          onClick={runCode}
          loading={isLoading}
          disabled={isLoading}
          alignSelf="flex-start"
          bg="#3b82f6"
          color="white"
          _hover={{ bg: '#2563eb' }}
          _active={{ bg: '#1d4ed8' }}
        >
          <Play size={15} style={{ marginRight: 6, fill: 'currentColor' }} />
          Run
        </Button>
        {shared && isLoading && (
          <PanelLabel color="#8a8a93">
            {sharedRun.isSelf ? 'running…' : `${sharedRun.runnerName} is running…`}
          </PanelLabel>
        )}
      </Box>

      {/* Input console (stdin) */}
      <Box border="1px solid" borderColor="#1e1e22" borderRadius={12} overflow="hidden" bg="#0b0b0e">
        <Box px={4} py={2} borderBottom="1px solid" borderColor="#1e1e22">
          <PanelLabel>stdin</PanelLabel>
        </Box>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type program input here before running…"
          height="120px"
          resize="none"
          overflowY="auto"
          fontFamily="mono"
          fontSize="sm"
          bg="transparent"
          color="#e6e6ea"
          border="none"
          borderRadius={0}
          px={4}
          py={3}
          _placeholder={{ color: '#5a5a63' }}
          _focus={{ boxShadow: 'none', outline: 'none' }}
        />
      </Box>

      {/* Output console — stdout in light, stderr in red. */}
      <Box
        flex="1"
        border="1px solid"
        borderColor={stderr ? '#ef4444' : '#1e1e22'}
        borderRadius={12}
        overflow="hidden"
        bg="#0b0b0e"
        display="flex"
        flexDirection="column"
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          px={4}
          py={2}
          borderBottom="1px solid"
          borderColor="#1e1e22"
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Terminal size={13} color="#8a8a93" />
            <PanelLabel>output</PanelLabel>
          </Box>
          {hasRun && (
            <PanelLabel color={stderr ? '#f87171' : '#10b981'}>
              {stderr ? 'error' : 'exit 0'}
            </PanelLabel>
          )}
        </Box>
        <Box
          height={{ base: '34vh', md: '46vh' }}
          p={4}
          overflow="auto"
          fontFamily="mono"
          fontSize="sm"
        >
          {hasRun ? (
            <>
              {stdout.split('\n').map((line, index) => (
                <Text key={`out-${index}`} color="#c9c9d0" whiteSpace="pre-wrap">
                  {line}
                </Text>
              ))}
              {stderr.split('\n').map((line, index) => (
                <Text key={`err-${index}`} color="#f87171" whiteSpace="pre-wrap">
                  {line}
                </Text>
              ))}
            </>
          ) : (
            <Text color="#5a5a63">Run your code to see the output here.</Text>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default Output
