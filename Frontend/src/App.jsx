import { Routes, Route, useParams } from 'react-router-dom'
import { Box } from '@chakra-ui/react'
import { ToastContainer } from 'react-toastify'
import CodeEditor from './components/codeEditor.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'

// Dark shell matching the Code Canvas theme.
function EditorShell({ children }) {
  return (
    <Box
      minH="100vh"
      bg="#000"
      color="#e6e6ea"
      px={{ base: 4, md: 6 }}
      py={{ base: 4, md: 6 }}
    >
      {children}
    </Box>
  )
}

// Collab room: has a roomId -> Save button + persistence.
function RoomEditor() {
  const { roomId } = useParams()
  return (
    <EditorShell>
      <CodeEditor roomId={roomId} />
    </EditorShell>
  )
}

// Plain online compiler: no room, no Save.
function CompilerEditor() {
  return (
    <EditorShell>
      <CodeEditor />
    </EditorShell>
  )
}

const App = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/room/:roomId" element={<RoomEditor />} />
        <Route path="/compiler" element={<CompilerEditor />} />
      </Routes>
      <ToastContainer />
    </>
  )
}

export default App
