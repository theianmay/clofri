import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { Login } from './components/Login'
import { Layout } from './components/Layout'
import { Home } from './components/Home'
import { GroupChat } from './components/GroupChat'
import { Friends } from './components/Friends'
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
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/group/:groupId" element={<GroupChat />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
