import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Auth() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    } else {
      if (username.trim().length < 3) {
        setError('Le pseudo doit faire au moins 3 caractères')
        setLoading(false)
        return
      }
      const { error } = await signUp(email, password, username.trim())
      if (error) setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="w-full max-w-md bg-[var(--bg-primary)] rounded-lg p-8 shadow-2xl">
        <div className="bg-[var(--bg-secondary)] rounded-lg p-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] text-center mb-1">
            {mode === 'login' ? 'Content de te revoir !' : 'Créer un compte'}
          </h1>
          <p className="text-[var(--text-muted)] text-center text-sm mb-6">
            {mode === 'login' ? 'Content de te revoir, on t\'a manqué !' : 'Rejoins ta communauté'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">
                  Pseudo
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  placeholder="TonPseudo"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            {error && (
              <p className="text-[var(--danger)] text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium rounded py-2.5 text-sm transition disabled:opacity-50"
            >
              {loading ? '...' : mode === 'login' ? 'Connexion' : "S'inscrire"}
            </button>
          </form>

          <p className="text-sm text-[var(--text-muted)] mt-4">
            {mode === 'login' ? (
              <>
                Besoin d'un compte ?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-[var(--text-link)] hover:underline"
                >
                  S'inscrire
                </button>
              </>
            ) : (
              <>
                Déjà un compte ?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="text-[var(--text-link)] hover:underline"
                >
                  Se connecter
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
