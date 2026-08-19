import { useRef, useEffect, useState } from 'react'
import { Paperclip, MessageSquare, UserPlus, UserMinus, Check, X, Users } from 'lucide-react'
import { useDMs } from '../hooks/useDMs'
import { useFriends } from '../hooks/useFriends'
import { useAuth } from '../hooks/useAuth'
import { STATUS_COLORS, STATUS_LABELS } from './NotificationsBell'

// Panneau des messages privés : conversations + amis
export default function DMPanel({ dms: dmsProp, onUserClick }) {
  const { session } = useAuth()
  const internalDms = useDMs({ disabled: !!dmsProp })
  const dms = dmsProp || internalDms
  const friends = useFriends()
  const [tab, setTab] = useState('msgs') // 'msgs' | 'amis'
  const [addUsername, setAddUsername] = useState('')
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

  const handleAddFriend = async (e) => {
    e.preventDefault()
    if (!addUsername.trim()) return
    const { error } = await friends.addFriend(addUsername)
    if (!error) setAddUsername('')
  }

  const activeConv = dms.conversations.find((c) => c.id === dms.activeId)
  const onlineFriends = friends.friends.filter((f) => f.status !== 'offline')
  const offlineFriends = friends.friends.filter((f) => f.status === 'offline')

  const FriendRow = ({ f, showActions = true }) => (
    <div className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--bg-hover)]">
      <button
        onClick={() => {
          dms.openConversation(f.id)
          onUserClick?.(f)
        }}
        className="flex items-center gap-2 min-w-0 flex-1 text-left"
        title={`${f.username} — ${STATUS_LABELS[f.status]}`}
      >
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold overflow-hidden">
            {f.avatar_url ? <img src={f.avatar_url} alt="" className="w-full h-full object-cover" /> : f.username?.slice(0, 2).toUpperCase()}
          </div>
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--bg-secondary)]"
            style={{ background: STATUS_COLORS[f.status] || STATUS_COLORS.offline }}
          />
        </div>
        <div className="min-w-0">
          <div className="text-sm text-[var(--text-secondary)] truncate">{f.username}</div>
          {f.custom_status && <div className="text-xs text-[var(--text-muted)] truncate">{f.custom_status}</div>}
        </div>
      </button>
      {showActions && (
        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
          <button
            onClick={() => dms.openConversation(f.id)}
            className="p-1.5 rounded hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            title="Message privé"
          >
            <MessageSquare size={14} />
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Retirer ${f.username} de tes amis ?`)) friends.decline(f.id)
            }}
            className="p-1.5 rounded hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--danger)]"
            title="Retirer des amis"
          >
            <UserMinus size={14} />
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex-1 flex min-w-0">
      {/* Colonne gauche : onglets Messages / Amis */}
      <div className="w-72 bg-[var(--bg-secondary)] flex flex-col shrink-0 border-r border-[var(--border)]">
        <div className="h-12 px-3 flex items-center gap-1 border-b border-[var(--border)] shrink-0">
          <button
            onClick={() => setTab('msgs')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition ${
              tab === 'msgs' ? 'bg-[var(--bg-active)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            Messages
          </button>
          <button
            onClick={() => setTab('amis')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition flex items-center gap-1.5 ${
              tab === 'amis' ? 'bg-[var(--bg-active)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <Users size={14} /> Amis
            {friends.requests.length > 0 && (
              <span className="bg-[var(--danger)] text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                {friends.requests.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {tab === 'msgs' && (
            <>
              {dms.conversations.length === 0 && (
                <p className="text-xs text-[var(--text-muted)] text-center px-4 py-6">
                  Aucune conversation.
                  <br />
                  Ajoute des amis (onglet Amis) ou clique sur un membre pour lui écrire.
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
            </>
          )}

          {tab === 'amis' && (
            <>
              {/* Ajouter un ami */}
              <form onSubmit={handleAddFriend} className="px-3 pb-3">
                <div className="flex gap-1.5">
                  <input
                    value={addUsername}
                    onChange={(e) => setAddUsername(e.target.value)}
                    placeholder="Pseudo d'un ami…"
                    className="flex-1 min-w-0 bg-[var(--bg-input)] text-[var(--text-secondary)] rounded px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                  <button
                    type="submit"
                    className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded px-2.5 flex items-center justify-center"
                    title="Envoyer la demande d'ami"
                  >
                    <UserPlus size={16} />
                  </button>
                </div>
                {friends.error && <p className="text-xs text-[var(--danger)] mt-1.5">{friends.error}</p>}
                <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
                  Tu peux aussi cliquer sur un membre et choisir « Ajouter ».
                </p>
              </form>

              {/* Demandes reçues */}
              {friends.requests.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase px-3 mb-1">
                    Demandes en attente ({friends.requests.length})
                  </p>
                  {friends.requests.map((f) => (
                    <div key={f.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--bg-hover)]">
                      <div className="w-9 h-9 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                        {f.avatar_url ? <img src={f.avatar_url} alt="" className="w-full h-full object-cover" /> : f.username?.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm text-[var(--text-secondary)] truncate flex-1">{f.username}</span>
                      <button
                        onClick={() => friends.accept(f.id)}
                        className="p-1.5 rounded bg-[var(--accent-green)] hover:opacity-85 text-white"
                        title="Accepter"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => friends.decline(f.id)}
                        className="p-1.5 rounded bg-[var(--danger)] hover:opacity-85 text-white"
                        title="Refuser"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Amis en ligne */}
              {onlineFriends.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase px-3 mb-1">
                    En ligne — {onlineFriends.length}
                  </p>
                  {onlineFriends.map((f) => (
                    <FriendRow key={f.id} f={f} />
                  ))}
                </div>
              )}

              {/* Amis hors ligne */}
              {offlineFriends.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase px-3 mb-1">
                    Hors ligne — {offlineFriends.length}
                  </p>
                  {offlineFriends.map((f) => (
                    <FriendRow key={f.id} f={f} />
                  ))}
                </div>
              )}

              {friends.friends.length === 0 && friends.requests.length === 0 && (
                <p className="text-xs text-[var(--text-muted)] text-center px-4 py-6">
                  Aucun ami pour l'instant.
                  <br />
                  Envoie une demande avec le pseudo d'un membre !
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col bg-[var(--bg-tertiary)] min-w-0">
        {!dms.activeId || !activeConv ? (
          <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm px-6 text-center">
            Sélectionne une conversation, ou clique sur le bouton « Message privé » d'un membre pour lui écrire
          </div>
        ) : (
          <>
            <div className="h-12 px-4 flex items-center border-b border-[var(--border)] shrink-0 gap-2">
              <button
                onClick={() => onUserClick?.(activeConv.other)}
                className="flex items-center gap-2 hover:opacity-85"
                title="Voir le profil"
              >
                <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                  {activeConv.other?.avatar_url ? (
                    <img src={activeConv.other.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    activeConv.other?.username?.slice(0, 2).toUpperCase()
                  )}
                </div>
                <span className="text-[var(--text-primary)] font-semibold">{activeConv.other?.username}</span>
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
                            <button
                              onClick={() => onUserClick?.(msg.author)}
                              className="text-[var(--text-primary)] font-medium text-[15px] hover:underline"
                            >
                              {msg.author?.username || 'Utilisateur'}
                            </button>
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
                              <Paperclip size={13} /> <span className="truncate">{att.name}</span>
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
