import { Routes, Route } from 'react-router-dom'
import { Box } from '@chakra-ui/react'
import { ToastContainer } from 'react-toastify'
import CodeEditor from './components/codeEditor.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'

// The existing Chakra-based editor. Reused as-is for both the collab room and
// the online compiler — its internals are unchanged (re-theme comes later).
function EditorRoute() {
  return (
    <Box
      minH="100vh"
      bg="#0f0a19"
      color="gray.300"
      px={{ base: 4, md: 6 }}
      py={{ base: 4, md: 8 }}
    >
      <CodeEditor />
    </Box>
  )
}

const App = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        {/* Same editor for collab room + online compiler. */}
        <Route path="/room/:roomId" element={<EditorRoute />} />
        <Route path="/compiler" element={<EditorRoute />} />
      </Routes>
      <ToastContainer />
    </>
  )
}

export default App
