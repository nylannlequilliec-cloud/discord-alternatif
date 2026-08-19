import { useState, useRef } from 'react'
import { MessageSquare, Plus, Compass, ArrowLeft, ImagePlus } from 'lucide-react'
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
  const [modalStep, setModalStep] = useState('choose') // 'choose' | 'create' | 'join'
  const [inputValue, setInputValue] = useState('')
  const [iconFile, setIconFile] = useState(null)
  const [iconPreview, setIconPreview] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const iconRef = useRef(null)

  const openModal = (mode) => {
    setModalStep(mode)
    setInputValue('')
    setError('')
    setIconFile(null)
    setIconPreview(null)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setError('')
    setSubmitting(false)
  }

  const handleSubmit = async () => {
    if (!inputValue.trim()) return
    setError('')
    setSubmitting(true)

    const result =
      modalStep === 'create' ? await onCreateServer(inputValue.trim(), iconFile) : await onJoinServer(inputValue.trim())

    setSubmitting(false)

    if (result?.error) {
      setError(typeof result.error === 'string' ? result.error : result.error.message || 'Une erreur est survenue')
      return
    }

    setInputValue('')
    setIconFile(null)
    setIconPreview(null)
    closeModal()
  }

  const handleIconPick = (file) => {
    if (!file) return
    setIconFile(file)
    setIconPreview(URL.createObjectURL(file))
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
        onClick={() => openModal('create')}
        className="w-12 h-12 rounded-3xl bg-[var(--bg-tertiary)] hover:rounded-2xl hover:bg-[var(--accent-green)] text-[var(--accent-green)] hover:text-white flex items-center justify-center transition-all"
        title="Créer un serveur"
      >
        <Plus size={24} />
      </button>

      <button
        onClick={() => openModal('join')}
        className="w-12 h-12 rounded-3xl bg-[var(--bg-tertiary)] hover:rounded-2xl hover:bg-[var(--accent-green)] text-[var(--accent-green)] hover:text-white flex items-center justify-center transition-all"
        title="Rejoindre un serveur"
      >
        <Compass size={22} />
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={closeModal}>
          <div className="bg-[var(--bg-modal)] rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {modalStep === 'choose' && (
              <div>
                <h2 className="text-center text-xl font-bold text-[var(--text-primary)] mb-2">Crée un espace pour discuter</h2>
                <p className="text-center text-sm text-[var(--text-muted)] mb-6">
                  Crée un serveur pour toi et tes amis, ou rejoins-en un existant avec un code d'invitation.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => setModalStep('create')}
                    className="w-full flex items-center gap-4 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] rounded-xl p-4 text-left transition border border-transparent hover:border-[var(--accent)]"
                  >
                    <span className="w-12 h-12 rounded-full bg-[var(--accent-green)] flex items-center justify-center text-white shrink-0">
                      <Plus size={22} />
                    </span>
                    <span>
                      <span className="block text-[var(--text-primary)] font-semibold">Créer un serveur</span>
                      <span className="block text-sm text-[var(--text-muted)]">Un espace tout neuf pour ta communauté</span>
                    </span>
                  </button>
                  <button
                    onClick={() => setModalStep('join')}
                    className="w-full flex items-center gap-4 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] rounded-xl p-4 text-left transition border border-transparent hover:border-[var(--accent)]"
                  >
                    <span className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-white shrink-0">
                      <Compass size={22} />
                    </span>
                    <span>
                      <span className="block text-[var(--text-primary)] font-semibold">Rejoindre un serveur</span>
                      <span className="block text-sm text-[var(--text-muted)]">Entre un code d'invitation partagé par un ami</span>
                    </span>
                  </button>
                </div>
              </div>
            )}

            {modalStep === 'create' && (
              <div>
                <button onClick={() => setModalStep('choose')} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] mb-3 flex items-center gap-1 text-sm">
                  <ArrowLeft size={15} /> Retour
                </button>
                <div className="flex justify-center mb-4">
                  <button
                    onClick={() => iconRef.current?.click()}
                    className="relative w-20 h-20 rounded-full bg-[var(--bg-secondary)] border-2 border-dashed border-[var(--text-muted)] hover:border-[var(--accent)] flex items-center justify-center overflow-hidden transition"
                    title="Choisir une icône"
                  >
                    {iconPreview ? (
                      <img src={iconPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="flex flex-col items-center text-[var(--text-muted)]">
                        <ImagePlus size={22} />
                        <span className="text-[10px] mt-0.5">Icône</span>
                      </span>
                    )}
                  </button>
                  <input ref={iconRef} type="file" accept="image/*" hidden onChange={(e) => { handleIconPick(e.target.files?.[0]); e.target.value = '' }} />
                </div>
                <h2 className="text-center text-xl font-bold text-[var(--text-primary)] mb-1">Donne un nom à ton serveur</h2>
                <p className="text-center text-sm text-[var(--text-muted)] mb-4">Tu pourras le changer à tout moment.</p>
                <input
                  autoFocus
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="Mon serveur"
                  className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] mb-2"
                />
                {error && <p className="text-[var(--danger)] text-sm mb-2">{error}</p>}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !inputValue.trim()}
                  className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium rounded py-2.5 text-sm mt-1 disabled:opacity-40"
                >
                  {submitting ? 'Création…' : 'Créer le serveur'}
                </button>
              </div>
            )}

            {modalStep === 'join' && (
              <div>
                <button onClick={() => setModalStep('choose')} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] mb-3 flex items-center gap-1 text-sm">
                  <ArrowLeft size={15} /> Retour
                </button>
                <h2 className="text-center text-xl font-bold text-[var(--text-primary)] mb-1">Rejoindre un serveur</h2>
                <p className="text-center text-sm text-[var(--text-muted)] mb-4">Entre le code d'invitation partagé par un ami.</p>
                <input
                  autoFocus
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="ex: a1b2c3d4"
                  className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] mb-2 text-center tracking-widest uppercase"
                />
                {error && <p className="text-[var(--danger)] text-sm mb-2">{error}</p>}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !inputValue.trim()}
                  className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium rounded py-2.5 text-sm mt-1 disabled:opacity-40"
                >
                  {submitting ? 'Connexion…' : 'Rejoindre le serveur'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
