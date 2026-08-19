import { MessageCircle, UserPlus, UserCheck, X } from 'lucide-react'
import { STATUS_LABELS, STATUS_COLORS } from './NotificationsBell'

// Carte de profil affichée au clic sur un membre / auteur de message
export default function ProfileCard({ user, isFriend, onClose, onDm, onAddFriend, onRemoveFriend }) {
  if (!user) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[90]" onClick={onClose}>
      <div
        className="bg-[var(--bg-modal)] rounded-xl w-full max-w-sm overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="h-20"
          style={{ background: `linear-gradient(135deg, ${STATUS_COLORS[user.status] || '#5865f2'}, var(--accent))` }}
        />
        <div className="px-6 pb-6 -mt-10">
          <div className="w-20 h-20 rounded-full bg-[var(--bg-modal)] p-1">
            <div className="w-full h-full rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xl font-bold overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                user.username?.slice(0, 2).toUpperCase()
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <h3 className="text-xl font-bold text-[var(--text-primary)]">{user.username}</h3>
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: STATUS_COLORS[user.status] || STATUS_COLORS.offline }}
              title={STATUS_LABELS[user.status]}
            />
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{STATUS_LABELS[user.status] || 'Hors ligne'}</p>
          {user.custom_status && (
            <p className="text-sm text-[var(--text-secondary)] mt-2 bg-[var(--bg-secondary)] rounded-lg px-3 py-2">
              {user.custom_status}
            </p>
          )}

          <div className="flex gap-2 mt-5">
            <button
              onClick={() => {
                onDm?.(user.id)
                onClose?.()
              }}
              className="flex-1 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium rounded px-4 py-2.5 text-sm flex items-center justify-center gap-2"
            >
              <MessageCircle size={15} /> Message
            </button>
            {isFriend ? (
              <button
                onClick={() => {
                  if (window.confirm(`Retirer ${user.username} de tes amis ?`)) {
                    onRemoveFriend?.(user.id)
                    onClose?.()
                  }
                }}
                className="flex-1 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] font-medium rounded px-4 py-2.5 text-sm flex items-center justify-center gap-2"
                title="Retirer des amis"
              >
                <UserCheck size={15} /> Ami
              </button>
            ) : (
              <button
                onClick={() => onAddFriend?.(user.username)}
                className="flex-1 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] font-medium rounded px-4 py-2.5 text-sm flex items-center justify-center gap-2"
              >
                <UserPlus size={15} /> Ajouter
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
            title="Fermer"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
