import { AuthProvider, useAuth } from './hooks/useAuth'
import Auth from './pages/Auth'
import Home from './pages/Home'

function AppContent() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#313338] text-white">
        Chargement...
      </div>
    )
  }

  return session ? <Home /> : <Auth />
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
