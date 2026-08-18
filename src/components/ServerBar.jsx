import { useState } from 'react'

export default function ServerBar({ servers, activeServerId, onSelectServer, onCreateServer, onJoinServer }) {
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' | 'join'
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!inputValue.trim()) return
    setError('')
    setSubmitting(true)

    const result = modalMode === 'create'
      ? await onCreateServer(inputValue.trim())
      : await onJoinServer(inputValue.trim())

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
    <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 gap-2 shrink-0">
      {servers.map((server) => (
        <button
          key={server.id}
          onClick={() => onSelectServer(server.id)}
          className={`w-12 h-12 flex items-center justify-center text-white font-medium transition-all
            ${activeServerId === server.id ? 'rounded-2xl bg-[#5865f2]' : 'rounded-3xl bg-[#313338] hover:rounded-2xl hover:bg-[#5865f2]'}
          `}
          title={server.name}
        >
          {server.icon_url ? (
            <img src={server.icon_url} alt="" className="w-full h-full rounded-[inherit] object-cover" />
          ) : (
            server.name.slice(0, 2).toUpperCase()
          )}
        </button>
      ))}

      <div className="w-8 h-px bg-[#35363c] my-1" />

      <button
        onClick={() => { setModalMode('create'); setShowModal(true) }}
        className="w-12 h-12 rounded-3xl bg-[#313338] hover:rounded-2xl hover:bg-[#23a55a] text-[#23a55a] hover:text-white flex items-center justify-center text-2xl transition-all"
        title="Créer un serveur"
      >
        +
      </button>

      <button
        onClick={() => { setModalMode('join'); setShowModal(true) }}
        className="w-12 h-12 rounded-3xl bg-[#313338] hover:rounded-2xl hover:bg-[#23a55a] text-[#23a55a] hover:text-white flex items-center justify-center text-lg transition-all"
        title="Rejoindre un serveur"
      >
        ↵
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => { setShowModal(false); setError('') }}>
          <div className="bg-[#313338] rounded-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-white font-bold text-lg mb-1">
              {modalMode === 'create' ? 'Créer un serveur' : 'Rejoindre un serveur'}
            </h2>
            <p className="text-[#b5bac1] text-sm mb-4">
              {modalMode === 'create' ? 'Donne un nom à ton serveur' : "Colle le code d'invitation"}
            </p>
            <input
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder={modalMode === 'create' ? 'Mon serveur' : 'ex: a1b2c3d4'}
              className="w-full bg-[#1e1f22] text-white rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5865f2] mb-2"
            />
            {error && <p className="text-[#fa777c] text-sm mb-2">{error}</p>}
            <div className="flex justify-end gap-3 mt-2">
              <button onClick={() => { setShowModal(false); setError('') }} className="text-sm text-white hover:underline">
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm font-medium rounded px-4 py-2 disabled:opacity-50"
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
