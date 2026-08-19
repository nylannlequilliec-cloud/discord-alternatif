import { useEffect, useState, useRef } from 'react'
import { X, Copy, ImagePlus, Crown, LogOut, Trash2, UserX, Ban } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { safeQuery } from '../hooks/useSchema'

// Gestion du serveur : nom, icône, invitation, bannis, transfert, départ/suppression
export default function ServerSettingsModal({ server, myRole, onClose, onUpdate, onDelete, onLeave, onTransfer }) {
  const [name, setName] = useState(server?.name || '')
  const [bans, setBans] = useState([])
  const [admins, setAdmins] = useState([])
  const [newOwner, setNewOwner] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const iconRef = useRef(null)
  const isOwner = myRole === 'owner'

  useEffect(() => {
    if (!server?.id) return
    // Liste des bannis (admin)
    safeQuery(
      supabase
        .from('bans')
        .select('server_id, user_id, reason, created_at, profile:profiles(id, username, avatar_url)')
        .eq('server_id', server.id)
        .order('created_at', { ascending: false })
    ).then(({ data }) => setBans(data || []))
    // Admins potentiels pour le transfert (owner)
    if (isOwner) {
      safeQuery(
        supabase
          .from('server_members')
          .select('user_id, role, profile:profiles(id, username)')
          .eq('server_id', server.id)
          .eq('role', 'admin')
      ).then(({ data }) => setAdmins((data || []).map((a) => a.profile).filter(Boolean)))
    }
  }, [server?.id, isOwner])

  if (!server) return null

  const flash = (m) => {
    setMsg(m)
    setTimeout(() => setMsg(''), 3000)
  }

  const saveName = async () => {
    if (!name.trim() || name.trim() === server.name) return
    setBusy(true)
    const { error } = await onUpdate({ name: name.trim() })
    setBusy(false)
    if (error) flash('Erreur : ' + error.message)
    else flash('Nom enregistré ✅')
  }

  const handleIcon = async (file) => {
    if (!file) return
    setBusy(true)
    const { error } = await onUpdate(null, file)
    setBusy(false)
    if (error) flash('Erreur : ' + error.message)
    else flash('Icône mise à jour ✅')
  }

  const copyInvite = () => {
    navigator.clipboard.writeText(server.invite_code)
    flash('Code copié ✅')
  }

  const unban = async (userId) => {
    const { error } = await supabase.from('bans').delete().eq('server_id', server.id).eq('user_id', userId)
    if (!error) {
      setBans((prev) => prev.filter((b) => b.user_id !== userId))
      flash('Membre débanni ✅')
    }
  }

  const doTransfer = async () => {
    if (!newOwner || !window.confirm('Transférer la propriété du serveur ? Tu deviendras admin.')) return
    setBusy(true)
    const { error } = await onTransfer(server.id, newOwner)
    setBusy(false)
    if (error) flash('Erreur : ' + error.message)
    else flash('Propriété transférée ✅')
  }

  const doLeave = async () => {
    if (!window.confirm('Quitter ce serveur ?')) return
    await onLeave(server.id)
    onClose()
  }

  const doDelete = async () => {
    if (!window.confirm('SUPPRIMER ce serveur ? Tous les salons et messages seront perdus définitivement.')) return
    if (!window.confirm(`Confirmation : écris la suppression définitive de « ${server.name} » ?`)) return
    await onDelete(server.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[90]" onClick={onClose}>
      <div
        className="bg-[var(--bg-modal)] rounded-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <span className="text-[var(--text-primary)] font-semibold flex items-center gap-2">
            <Crown size={15} className="text-[#f0b232]" /> Paramètres du serveur
          </span>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Nom + icône */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => iconRef.current?.click()}
              className="relative w-16 h-16 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold overflow-hidden hover:opacity-85 shrink-0"
              title="Changer l'icône"
            >
              {server.icon_url ? (
                <img src={server.icon_url} alt="" className="w-full h-full object-cover" />
              ) : (
                server.name.slice(0, 2).toUpperCase()
              )}
              {isOwner && (
                <span className="absolute bottom-0 inset-x-0 bg-black/50 flex items-center justify-center py-0.5">
                  <ImagePlus size={12} />
                </span>
              )}
            </button>
            <input ref={iconRef} type="file" accept="image/*" hidden onChange={(e) => { handleIcon(e.target.files?.[0]); e.target.value = '' }} />
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1.5">Nom du serveur</label>
              <div className="flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isOwner}
                  className="flex-1 min-w-0 bg-[var(--bg-input)] text-[var(--text-primary)] rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
                />
                {isOwner && (
                  <button onClick={saveName} disabled={busy} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm rounded px-3 disabled:opacity-50">
                    OK
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Invitation */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1.5">Code d'invitation</label>
            <div className="flex gap-2">
              <input readOnly value={server.invite_code} className="flex-1 bg-[var(--bg-input)] text-[var(--text-primary)] rounded px-3 py-2 text-sm tracking-widest" />
              <button onClick={copyInvite} className="bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded px-3" title="Copier">
                <Copy size={15} />
              </button>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1.5">Partage ce code pour inviter des amis.</p>
          </div>

          {/* Bannis */}
          {bans.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1.5">Bannis ({bans.length})</label>
              <div className="space-y-1.5">
                {bans.map((b) => (
                  <div key={b.user_id} className="flex items-center gap-2 bg-[var(--bg-secondary)] rounded-lg px-3 py-2">
                    <Ban size={13} className="text-[var(--danger)] shrink-0" />
                    <span className="text-sm text-[var(--text-secondary)] truncate flex-1">{b.profile?.username || 'Utilisateur'}</span>
                    {b.reason && <span className="text-xs text-[var(--text-muted)] truncate max-w-[100px]">{b.reason}</span>}
                    <button
                      onClick={() => unban(b.user_id)}
                      className="text-xs text-[var(--text-link)] hover:underline shrink-0"
                      title="Débannir"
                    >
                      Débannir
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {msg && <p className="text-sm text-[var(--accent-green)]">{msg}</p>}

          {/* Zone dangereuse */}
          <div className="border-t border-[var(--border)] pt-4 space-y-2">
            {isOwner && admins.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                  className="flex-1 bg-[var(--bg-input)] text-[var(--text-primary)] rounded px-3 py-2 text-sm outline-none"
                >
                  <option value="">Transférer la propriété à…</option>
                  {admins.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.username}
                    </option>
                  ))}
                </select>
                <button
                  onClick={doTransfer}
                  disabled={!newOwner || busy}
                  className="bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] text-sm rounded px-3 py-2 disabled:opacity-40"
                >
                  Transférer
                </button>
              </div>
            )}
            <button
              onClick={doLeave}
              className="w-full flex items-center gap-2 text-sm text-[var(--warning)] hover:bg-[var(--bg-hover)] rounded px-3 py-2"
            >
              <LogOut size={14} /> Quitter le serveur
            </button>
            {isOwner && (
              <button
                onClick={doDelete}
                className="w-full flex items-center gap-2 text-sm text-[var(--danger)] hover:bg-[var(--bg-hover)] rounded px-3 py-2"
              >
                <Trash2 size={14} /> Supprimer définitivement le serveur
              </button>
            )}
            <button
              onClick={() => {
                onClose()
              }}
              className="w-full flex items-center gap-2 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-hover)] rounded px-3 py-2"
            >
              <UserX size={14} /> Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
