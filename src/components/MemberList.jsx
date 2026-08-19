import { useState } from 'react'
import {
  Smile,
  MessageSquarePlus,
  MessageCircle,
  Pencil,
  Trash2,
  Crown,
  ShieldCheck,
  MoreHorizontal,
  MicOff,
  Mic,
  Eraser,
  UserX,
  Ban,
} from 'lucide-react'
import { useMembers } from '../hooks/useMembers'
import { useAuth } from '../hooks/useAuth'
import { STATUS_COLORS } from './NotificationsBell'

export default function MemberList({ serverId, onDmUser, membersApi }) {
  const { session } = useAuth()
  const internal = useMembers(serverId, { disabled: !!membersApi })
  const { members, canModerate, banMember, muteMember, unmuteMember, setRole, deleteUserMessages, kickMember } =
    membersApi || internal
  const [menuFor, setMenuFor] = useState(null) // userId avec menu ouvert
  const [banTarget, setBanTarget] = useState(null) // userId à bannir
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const sorted = [...members].sort((a, b) => {
    const order = { owner: 0, admin: 1, member: 2 }
    return (order[a.role] ?? 3) - (order[b.role] ?? 3)
  })

  const target = members.find((m) => m.profile?.id === (banTarget || menuFor))

  const doBan = async () => {
    setBusy(true)
    await banMember(banTarget, reason.trim())
    setBusy(false)
    setBanTarget(null)
    setMenuFor(null)
    setReason('')
  }

  const doAction = async (fn) => {
    setBusy(true)
    await fn()
    setBusy(false)
    setMenuFor(null)
  }

  return (
    <div className="w-60 bg-[var(--bg-secondary)] shrink-0 overflow-y-auto py-4 px-2 hidden lg:block" data-ui-id="member-list">
      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase px-2 mb-2">
        Membres — {members.length}
      </p>
      {sorted.map((m) => {
        const isOwner = m.role === 'owner'
        const canTarget = canModerate && m.profile?.id !== session?.user?.id && !isOwner
        return (
          <div
            key={m.profile?.id}
            className="relative flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--bg-hover)] group"
            onMouseLeave={() => setMenuFor((cur) => (cur === m.profile?.id ? null : cur))}
          >
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                {m.profile?.avatar_url ? (
                  <img src={m.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  m.profile?.username?.slice(0, 2).toUpperCase()
                )}
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--bg-secondary)]"
                style={{ background: STATUS_COLORS[m.profile?.status] || STATUS_COLORS.offline }}
              />
            </div>
            <span className="text-sm text-[var(--text-muted)] truncate flex-1">{m.profile?.username}</span>
            {isOwner && <Crown size={14} className="text-[#f0b232] shrink-0" title="Propriétaire" />}
            {m.role === 'admin' && <ShieldCheck size={14} className="text-[#23a55a] shrink-0" title="Admin" />}
            {m.muted_until && new Date(m.muted_until) > new Date() && (
              <MicOff size={13} className="text-[var(--text-muted)] shrink-0" title="Rendu muet" />
            )}
            <button
              onClick={() => setMenuFor((cur) => (cur === m.profile?.id ? null : m.profile?.id))}
              className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--text-secondary)] p-0.5"
              title="Actions"
            >
              <MoreHorizontal size={15} />
            </button>

            {menuFor === m.profile?.id && (
              <div className="absolute left-2 right-2 top-full mt-1 bg-[var(--bg-modal)] border border-[var(--border)] rounded-lg shadow-xl z-50 py-1">
                <button
                  onClick={() => {
                    onDmUser?.(m.profile.id)
                    setMenuFor(null)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                >
                  <MessageCircle size={14} /> Message privé
                </button>
                {canTarget && (
                  <>
                    <div className="border-t border-[var(--border)] my-1" />
                    <button
                      onClick={() => doAction(() => setRole(m.profile.id, m.role === 'admin' ? 'member' : 'admin'))}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                    >
                      {m.role === 'admin' ? (
                        <>
                          <ShieldCheck size={14} /> Retirer le rôle admin
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={14} /> Nommer admin
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => doAction(() => muteMember(m.profile.id, 10))}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                    >
                      <MicOff size={14} /> Rendre muet 10 min
                    </button>
                    <button
                      onClick={() => doAction(() => muteMember(m.profile.id, 60))}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                    >
                      <MicOff size={14} /> Rendre muet 1 h
                    </button>
                    {m.muted_until && (
                      <button
                        onClick={() => doAction(() => unmuteMember(m.profile.id))}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                      >
                        <Mic size={14} /> Retirer le mute
                      </button>
                    )}
                    <button
                      onClick={() => doAction(() => deleteUserMessages(m.profile.id))}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                    >
                      <Eraser size={14} /> Supprimer ses messages
                    </button>
                    <button
                      onClick={() => doAction(() => kickMember(m.profile.id))}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--warning)] hover:bg-[var(--bg-hover)]"
                    >
                      <UserX size={14} /> Expulser du serveur
                    </button>
                    <button
                      onClick={() => setBanTarget(m.profile.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--danger)] hover:bg-[var(--bg-hover)]"
                    >
                      <Ban size={14} /> Bannir…
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Modale de bannissement */}
      {banTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80]" onClick={() => setBanTarget(null)}>
          <div className="bg-[var(--bg-modal)] rounded-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[var(--text-primary)] font-bold text-lg mb-2">Bannir {target?.profile?.username}</h3>
            <input
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Raison (optionnel)"
              className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setBanTarget(null)} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                Annuler
              </button>
              <button
                onClick={doBan}
                disabled={busy}
                className="bg-[var(--danger)] hover:opacity-80 text-white text-sm font-medium rounded px-4 py-2 disabled:opacity-50"
              >
                Bannir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
