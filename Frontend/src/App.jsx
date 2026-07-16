import { Box } from '@chakra-ui/react'
import { ToastContainer } from 'react-toastify'
import CodeEditor from './components/codeEditor.jsx'

const App = () => {
  return (
    <Box
      minH="100vh"
      bg="#0f0a19"
      color="gray.300"
      px={{ base: 4, md: 6 }}
      py={{ base: 4, md: 8 }}
    >
      <CodeEditor />
      <ToastContainer />
    </Box>
  )
}

export default App
