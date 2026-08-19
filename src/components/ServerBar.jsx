import { useState } from 'react'
import { MessageSquare, Plus, Compass } from 'lucide-react'
import NotificationsBell from './NotificationsBell'

export default function ServerBar({
  servers,
  activeServerId,
  onSelectServer,
  onCreateServer,
  onJoinServer,
  onHome,
  dmUnread,
  onOpenDm,
  onOpenMention,
}) {
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!inputValue.trim()) return
    setError('')
    setSubmitting(true)

    const result =
      modalMode === 'create' ? await onCreateServer(inputValue.trim()) : await onJoinServer(inputValue.trim())

    setSubmitting(false)

    if (result?.error) {
      setError(typeof result.error === 'string' ? result.error : result.error.message || 'Une erreur est survenue')
      return
    }

    setInputValue('')
    setError('')
    setShowModal(false)
  }

  return (
    <div className="w-[72px] bg-[var(--bg-primary)] flex flex-col items-center py-3 gap-2 shrink-0" data-ui-id="server-bar">
      <button
        onClick={onHome}
        className={`w-12 h-12 flex items-center justify-center text-white font-medium transition-all relative ${
          activeServerId === null ? 'rounded-2xl bg-[var(--accent)]' : 'rounded-3xl bg-[var(--bg-tertiary)] hover:rounded-2xl hover:bg-[var(--accent)]'
        }`}
        title="Messages privés"
      >
        <MessageSquare size={22} />
        {dmUnread > 0 && (
          <span className="absolute -top-1 -right-1 bg-[var(--danger)] text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
            {dmUnread > 9 ? '9+' : dmUnread}
          </span>
        )}
      </button>

      <NotificationsBell onOpenDm={onOpenDm} onOpenMention={onOpenMention} />

      <div className="w-8 h-px bg-[var(--bg-hover)] my-1" />

      {servers.map((server) => (
        <button
          key={server.id}
          onClick={() => onSelectServer(server.id)}
          className={`w-12 h-12 flex items-center justify-center text-white font-medium transition-all overflow-hidden ${
            activeServerId === server.id
              ? 'rounded-2xl bg-[var(--accent)]'
              : 'rounded-3xl bg-[var(--bg-tertiary)] hover:rounded-2xl hover:bg-[var(--accent)]'
          }`}
          title={server.name}
        >
          {server.icon_url ? (
            <img src={server.icon_url} alt="" className="w-full h-full object-cover" />
          ) : (
            server.name.slice(0, 2).toUpperCase()
          )}
        </button>
      ))}

      <button
        onClick={() => {
          setModalMode('create')
          setShowModal(true)
        }}
        className="w-12 h-12 rounded-3xl bg-[var(--bg-tertiary)] hover:rounded-2xl hover:bg-[var(--accent-green)] text-[var(--accent-green)] hover:text-white flex items-center justify-center transition-all"
        title="Créer un serveur"
      >
        <Plus size={24} />
      </button>

      <button
        onClick={() => {
          setModalMode('join')
          setShowModal(true)
        }}
        className="w-12 h-12 rounded-3xl bg-[var(--bg-tertiary)] hover:rounded-2xl hover:bg-[var(--accent-green)] text-[var(--accent-green)] hover:text-white flex items-center justify-center transition-all"
        title="Rejoindre un serveur"
      >
        <Compass size={22} />
      </button>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => {
            setShowModal(false)
            setError('')
          }}
        >
          <div className="bg-[var(--bg-modal)] rounded-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[var(--text-primary)] font-bold text-lg mb-1">
              {modalMode === 'create' ? 'Créer un serveur' : 'Rejoindre un serveur'}
            </h2>
            <p className="text-[var(--text-muted)] text-sm mb-4">
              {modalMode === 'create' ? 'Donne un nom à ton serveur' : "Colle le code d'invitation"}
            </p>
            <input
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder={modalMode === 'create' ? 'Mon serveur' : 'ex: a1b2c3d4'}
              className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] mb-2"
            />
            {error && <p className="text-[var(--danger)] text-sm mb-2">{error}</p>}
            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={() => {
                  setShowModal(false)
                  setError('')
                }}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded px-4 py-2 disabled:opacity-50"
              >
                {submitting ? '...' : modalMode === 'create' ? 'Créer' : 'Rejoindre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
