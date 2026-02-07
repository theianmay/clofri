import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { Login } from './components/Login'
import { Layout } from './components/Layout'
import { Home } from './components/Home'
import { GroupChat } from './components/GroupChat'
import { Friends } from './components/Friends'
import { Messages } from './components/Messages'
import { DMChat } from './components/DMChat'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Loader2 } from 'lucide-react'

function App() {
  const { user, loading, initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<ErrorBoundary><Friends /></ErrorBoundary>} />
            <Route path="/messages" element={<ErrorBoundary><Messages /></ErrorBoundary>} />
            <Route path="/dm/:friendId" element={<ErrorBoundary><DMChat /></ErrorBoundary>} />
            <Route path="/groups" element={<ErrorBoundary><Home /></ErrorBoundary>} />
            <Route path="/group/:groupId" element={<ErrorBoundary><GroupChat /></ErrorBoundary>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
