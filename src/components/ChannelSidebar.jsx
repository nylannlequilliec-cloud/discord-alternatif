import { useState } from 'react'
import { Plus, Pencil, Trash2, Settings, Paintbrush, LogOut, Volume2, VolumeX, MessageSquareText } from 'lucide-react'
import { STATUS_COLORS } from './NotificationsBell'

export default function ChannelSidebar({
  server,
  channels,
  activeChannelId,
  onSelectChannel,
  onCreateChannel,
  onRenameChannel,
  onDeleteChannel,
  profile,
  onSignOut,
  onOpenSettings,
  editMode,
  onToggleEditMode,
  threads,
  onOpenThread,
  onJoinVoice,
  voiceChannelId,
  myRole,
}) {
  const [showModal, setShowModal] = useState(null) // 'create' | 'rename' | null
  const [newChannelName, setNewChannelName] = useState('')
  const [renameTarget, setRenameTarget] = useState(null)
  const [showInvite, setShowInvite] = useState(false)

  const isAdmin = myRole === 'owner' || myRole === 'admin'
  const textChannels = channels.filter((c) => c.type === 'text')
  const voiceChannels = channels.filter((c) => c.type === 'voice')

  const handleCreate = async () => {
    if (!newChannelName.trim()) return
    await onCreateChannel(newChannelName.trim())
    setNewChannelName('')
    setShowModal(null)
  }

  const handleRename = async () => {
    if (!newChannelName.trim()) return
    await onRenameChannel(renameTarget, newChannelName.trim())
    setNewChannelName('')
    setRenameTarget(null)
    setShowModal(null)
  }

  const handleDeleteChannel = async (channelId, name) => {
    if (!window.confirm(`Supprimer le salon #${name} ? Tous ses messages seront perdus.`)) return
    await onDeleteChannel(channelId)
  }

  const copyInvite = () => {
    navigator.clipboard.writeText(server.invite_code)
  }

  return (
    <div className="w-60 bg-[var(--bg-secondary)] flex flex-col shrink-0" data-ui-id="channel-sidebar">
      <button
        onClick={() => setShowInvite(true)}
        className="h-12 px-4 flex items-center justify-between border-b border-[var(--border)] shadow-sm shrink-0 hover:bg-[var(--bg-hover)] transition"
        title="Inviter des amis (code d'invitation)"
      >
        <span className="text-[var(--text-primary)] font-semibold text-[15px] truncate">{server?.name}</span>
      </button>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <div className="mb-4">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Salons textuels</span>
            {isAdmin && (
              <button onClick={() => setShowModal('create')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <Plus size={16} />
              </button>
            )}
          </div>
          {textChannels.map((c) => (
            <div key={c.id} className="group relative flex items-center rounded">
              <button
                onClick={() => onSelectChannel(c)}
                className={`flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition min-w-0 ${
                  activeChannelId === c.id
                    ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <span className="text-[var(--text-faint)] text-lg">#</span>
                <span className="truncate">{c.name}</span>
              </button>
              {isAdmin && (
                <div className="absolute right-1 hidden group-hover:flex items-center gap-0.5 z-10">
                  <button
                    onClick={() => {
                      setRenameTarget(c.id)
                      setNewChannelName(c.name)
                      setShowModal('rename')
                    }}
                    className="w-6 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-active)] rounded"
                    title="Renommer"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteChannel(c.id, c.name)}
                    className="w-6 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--bg-active)] rounded"
                    title="Supprimer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {voiceChannels.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Salons vocaux</span>
            </div>
            {voiceChannels.map((c) => {
              const connected = voiceChannelId === c.id
              return (
                <div key={c.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded text-sm text-[var(--text-muted)] hover:bg-[var(--bg-hover)]">
                  {connected ? (
                    <Volume2 size={16} className="text-[var(--accent-green)] shrink-0" />
                  ) : (
                    <VolumeX size={16} className="shrink-0" />
                  )}
                  <span className="truncate flex-1">{c.name}</span>
                  <button
                    onClick={() => onJoinVoice(c)}
                    className={`text-xs px-2 py-1 rounded transition ${
                      connected
                        ? 'bg-[var(--danger)] text-white'
                        : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white'
                    }`}
                  >
                    {connected ? 'Quitter' : 'Rejoindre'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {threads.length > 0 && (
          <div>
            <div className="px-2 mb-1">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Fils actifs</span>
            </div>
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => onOpenThread(t.id)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-sm text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
              >
                <MessageSquareText size={14} className="shrink-0" />
                <span className="truncate">{t.content.slice(0, 30) || 'Fil'}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-[52px] bg-[var(--bg-userbar)] px-2 flex items-center gap-2 shrink-0" data-ui-id="user-bar">
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              profile?.username?.slice(0, 2).toUpperCase()
            )}
          </div>
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--bg-userbar)]"
            style={{ background: STATUS_COLORS[profile?.status] || STATUS_COLORS.offline }}
          />
        </div>
        <span className="text-sm text-[var(--text-primary)] font-medium truncate flex-1">{profile?.username}</span>
        <button onClick={onOpenSettings} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1" title="Paramètres">
          <Settings size={16} />
        </button>
        <button
          onClick={onToggleEditMode}
          className={`p-1 ${editMode ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
          title="Mode édition de l'interface (déplacer, redimensionner, opacité…)"
        >
          <Paintbrush size={16} />
        </button>
        <button onClick={onSignOut} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1" title="Déconnexion">
          <LogOut size={16} />
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowModal(null)}>
          <div className="bg-[var(--bg-modal)] rounded-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[var(--text-primary)] font-bold text-lg mb-4">
              {showModal === 'create' ? 'Créer un salon' : 'Renommer le salon'}
            </h2>
            <input
              autoFocus
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (showModal === 'create' ? handleCreate() : handleRename())}
              placeholder="nouveau-salon"
              className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(null)} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                Annuler
              </button>
              <button
                onClick={showModal === 'create' ? handleCreate : handleRename}
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded px-4 py-2"
              >
                {showModal === 'create' ? 'Créer' : 'Renommer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showInvite && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowInvite(false)}>
          <div className="bg-[var(--bg-modal)] rounded-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[var(--text-primary)] font-bold text-lg mb-1">Inviter des amis</h2>
            <p className="text-[var(--text-muted)] text-sm mb-4">Partage ce code pour rejoindre « {server?.name} »</p>
            <div className="flex gap-2">
              <input readOnly value={server?.invite_code} className="flex-1 bg-[var(--bg-input)] text-[var(--text-primary)] rounded px-3 py-2.5 text-sm" />
              <button onClick={copyInvite} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded px-4">
                Copier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
