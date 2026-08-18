import { AuthProvider, useAuth } from './hooks/useAuth'
import { UIProvider } from './context/UIContext'
import Auth from './pages/Auth'
import Home from './pages/Home'

function AppContent() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-primary)] text-white">
        Chargement...
      </div>
    )
  }

  return session ? <Home /> : <Auth />
}

export default function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <AppContent />
      </UIProvider>
    </AuthProvider>
  )
}
