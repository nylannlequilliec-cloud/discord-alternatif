import { useState } from 'react'

export default function ChannelSidebar({ server, channels, activeChannelId, onSelectChannel, onCreateChannel, profile, onSignOut }) {
  const [showModal, setShowModal] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [showInvite, setShowInvite] = useState(false)

  const handleCreate = async () => {
    if (!newChannelName.trim()) return
    await onCreateChannel(newChannelName.trim())
    setNewChannelName('')
    setShowModal(false)
  }

  const copyInvite = () => {
    navigator.clipboard.writeText(server.invite_code)
  }

  const textChannels = channels.filter((c) => c.type === 'text')
  const voiceChannels = channels.filter((c) => c.type === 'voice')

  return (
    <div className="w-60 bg-[#2b2d31] flex flex-col shrink-0">
      <button
        onClick={() => setShowInvite(true)}
        className="h-12 px-4 flex items-center justify-between border-b border-[#1e1f22] shadow-sm shrink-0 hover:bg-[#35373c] transition"
      >
        <span className="text-white font-semibold text-[15px] truncate">{server?.name}</span>
      </button>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <div className="mb-4">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-xs font-semibold text-[#949ba4] uppercase">Salons textuels</span>
            <button onClick={() => setShowModal(true)} className="text-[#949ba4] hover:text-white text-lg leading-none">+</button>
          </div>
          {textChannels.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectChannel(c)}
              className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition
                ${activeChannelId === c.id ? 'bg-[#404249] text-white' : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'}
              `}
            >
              <span className="text-[#80848e] text-lg">#</span>
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </div>

        {voiceChannels.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-xs font-semibold text-[#949ba4] uppercase">Salons vocaux</span>
            </div>
            {voiceChannels.map((c) => (
              <div key={c.id} className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-sm text-[#949ba4]">
                <span>🔊</span>
                <span className="truncate">{c.name}</span>
                <span className="text-xs ml-auto opacity-60">v2</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-[52px] bg-[#232428] px-2 flex items-center gap-2 shrink-0">
        <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-xs font-bold shrink-0">
          {profile?.username?.slice(0, 2).toUpperCase()}
        </div>
        <span className="text-sm text-white font-medium truncate flex-1">{profile?.username}</span>
        <button onClick={onSignOut} className="text-[#949ba4] hover:text-white text-xs px-2" title="Déconnexion">
          ⏻
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-[#313338] rounded-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-white font-bold text-lg mb-4">Créer un salon</h2>
            <input
              autoFocus
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="nouveau-salon"
              className="w-full bg-[#1e1f22] text-white rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5865f2] mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="text-sm text-white hover:underline">Annuler</button>
              <button onClick={handleCreate} className="bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm font-medium rounded px-4 py-2">
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {showInvite && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowInvite(false)}>
          <div className="bg-[#313338] rounded-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-white font-bold text-lg mb-1">Inviter des amis</h2>
            <p className="text-[#b5bac1] text-sm mb-4">Partage ce code pour rejoindre "{server?.name}"</p>
            <div className="flex gap-2">
              <input readOnly value={server?.invite_code} className="flex-1 bg-[#1e1f22] text-white rounded px-3 py-2.5 text-sm" />
              <button onClick={copyInvite} className="bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm font-medium rounded px-4">
                Copier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
