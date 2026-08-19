import { useRef, useEffect } from 'react'
import { useDMs } from '../hooks/useDMs'
import { useAuth } from '../hooks/useAuth'

// Panneau des messages privés : liste des conversations + chat
export default function DMPanel({ onOpenConversation, dms: dmsProp }) {
  const { session } = useAuth()
  const internalDms = useDMs({ disabled: !!dmsProp })
  const dms = dmsProp || internalDms
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [dms.messages.length, dms.activeId])

  const handleSend = async (e) => {
    e.preventDefault()
    const value = inputRef.current?.value || ''
    if (!value.trim()) return
    inputRef.current.value = ''
    await dms.sendMessage(value)
  }

  const activeConv = dms.conversations.find((c) => c.id === dms.activeId)

  return (
    <div className="flex-1 flex min-w-0">
      {/* Liste des conversations */}
      <div className="w-64 bg-[var(--bg-secondary)] flex flex-col shrink-0">
        <div className="h-12 px-4 flex items-center border-b border-[var(--border)] shrink-0">
          <span className="text-[var(--text-primary)] font-semibold">Messages privés</span>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {dms.conversations.length === 0 && (
            <p className="text-xs text-[var(--text-muted)] text-center px-4 py-6">
              Aucune conversation. Clique sur un membre pour lui écrire.
            </p>
          )}
          {dms.conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => dms.setActiveId(c.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--bg-hover)] transition ${
                dms.activeId === c.id ? 'bg-[var(--bg-active)]' : ''
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                {c.other?.avatar_url ? (
                  <img src={c.other.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  c.other?.username?.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-[var(--text-secondary)] truncate">{c.other?.username}</div>
                <div className="text-xs text-[var(--text-muted)] truncate">
                  {c.lastMessage
                    ? `${c.lastMessage.author_id === session?.user?.id ? 'Vous : ' : ''}${c.lastMessage.content.slice(0, 40)}`
                    : 'Nouvelle conversation'}
                </div>
              </div>
              {dms.unread[c.id] > 0 && (
                <span className="bg-[var(--danger)] text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                  {dms.unread[c.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col bg-[var(--bg-tertiary)] min-w-0">
        {!dms.activeId || !activeConv ? (
          <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm px-6 text-center">
            Sélectionne une conversation, ou clique sur le bouton 💬 d'un membre pour lui écrire
          </div>
        ) : (
          <>
            <div className="h-12 px-4 flex items-center border-b border-[var(--border)] shrink-0 gap-2">
              <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                {activeConv.other?.avatar_url ? (
                  <img src={activeConv.other.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  activeConv.other?.username?.slice(0, 2).toUpperCase()
                )}
              </div>
              <span className="text-[var(--text-primary)] font-semibold">{activeConv.other?.username}</span>
              <button
                onClick={() => onOpenConversation?.(activeConv.other.id)}
                className="ml-auto text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                title="Ouvrir le profil"
              >
                👤
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col-reverse">
              <div ref={bottomRef} />
              <div className="flex flex-col">
                {dms.messages.length === 0 && (
                  <p className="text-center text-[var(--text-muted)] text-sm py-8">
                    Début de la conversation avec {activeConv.other?.username}
                  </p>
                )}
                {dms.messages.map((msg, i) => {
                  const prev = dms.messages[i - 1]
                  const grouped =
                    prev && prev.author_id === msg.author_id && new Date(msg.created_at) - new Date(prev.created_at) < 5 * 60 * 1000
                  const own = msg.author_id === session?.user?.id
                  return (
                    <div key={msg.id} className={`px-4 flex gap-3 hover:bg-[var(--bg-hover)] ${grouped ? 'py-0.5' : 'py-2 mt-2'}`}>
                      {!grouped ? (
                        <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden">
                          {msg.author?.avatar_url ? (
                            <img src={msg.author.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            msg.author?.username?.slice(0, 2).toUpperCase() || '??'
                          )}
                        </div>
                      ) : (
                        <div className="w-10 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        {!grouped && (
                          <div className="flex items-baseline gap-2">
                            <span className="text-[var(--text-primary)] font-medium text-[15px]">{msg.author?.username || 'Utilisateur'}</span>
                            <span className="text-xs text-[var(--text-muted)]">
                              {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                        <p className="text-[var(--text-secondary)] text-[15px] break-words whitespace-pre-wrap">{msg.content}</p>
                        {(msg.attachments || []).map((att, i) =>
                          att.type?.startsWith('image/') ? (
                            <a key={i} href={att.url} target="_blank" rel="noreferrer" className="block mt-1.5 max-w-md">
                              <img src={att.url} alt={att.name} className="max-h-72 rounded-lg border border-[var(--border)]" />
                            </a>
                          ) : (
                            <a key={i} href={att.url} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-2 bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm rounded px-3 py-2">
                              📎 <span className="truncate">{att.name}</span>
                            </a>
                          )
                        )}
                        {own && (
                          <button
                            onClick={() => {
                              if (window.confirm('Supprimer ce message ?')) dms.deleteMessage(msg.id)
                            }}
                            className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)] mt-1"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <form onSubmit={handleSend} className="px-4 pb-6 pt-2 shrink-0">
              <input
                ref={inputRef}
                placeholder={`Écrire à ${activeConv.other?.username}…`}
                className="w-full bg-[var(--bg-input)] text-[var(--text-secondary)] rounded-lg px-4 py-2.5 text-sm outline-none placeholder-[var(--text-muted)]"
              />
            </form>
          </>
        )}
      </div>
    </div>
  )
}
