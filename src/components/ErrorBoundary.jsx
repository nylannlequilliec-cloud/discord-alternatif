import { Component } from 'react'
import { TriangleAlert } from 'lucide-react'

// Garde-fou : si un composant plante, on affiche un message clair
// (au lieu d'un écran gris) avec le détail de l'erreur.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      const msg = String(this.state.error?.message || this.state.error)
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-primary)] px-6">
          <div className="bg-[var(--bg-secondary)] rounded-lg p-8 max-w-md w-full text-center">
            <TriangleAlert size={40} className="mx-auto mb-3 text-[var(--warning)]" />
            <h2 className="text-[var(--text-primary)] font-bold text-lg mb-2">
              Oups, une erreur est survenue
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              L'interface a rencontré un problème inattendu. Recharge la page pour continuer.
              <br />
              <span className="text-xs text-[var(--danger)] block mt-2 break-words">{msg}</span>
            </p>
            <button
              onClick={() => {
                this.setState({ error: null })
                window.location.reload()
              }}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium rounded px-5 py-2 text-sm"
            >
              Recharger l'application
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
