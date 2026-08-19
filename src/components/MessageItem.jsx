import { useState } from 'react'
import {
  Smile,
  MessageSquarePlus,
  MessageCircle,
  Pencil,
  Trash2,
  Paperclip,
  CornerUpLeft,
  Pin,
} from 'lucide-react'
import EmojiPicker from './EmojiPicker'
import { supabase } from '../lib/supabase'
import { renderMarkdown } from '../lib/markdown'

function formatTime(iso) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function Attachment({ att }) {
  const isImage = att.type?.startsWith('image/')
  if (isImage) {
    return (
      <a href={att.url} target="_blank" rel="noreferrer" className="block mt-1.5 max-w-md">
        <img src={att.url} alt={att.name} className="max-h-72 rounded-lg border border-[var(--border)]" />
      </a>
    )
  }
  return (
    <a
      href={att.url}
      target="_blank"
      rel="noreferrer"
      className="mt-1.5 inline-flex items-center gap-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] text-sm rounded px-3 py-2 max-w-full"
    >
      <Paperclip size={13} className="shrink-0" />
      <span className="truncate">{att.name}</span>
      <span className="text-xs text-[var(--text-muted)]">{(att.size / 1024).toFixed(0)} Ko</span>
    </a>
  )
}

export default function MessageItem({
  msg,
  prev,
  currentUserId,
  canModerate,
  canPin,
  replyTo,
  onOpenThread,
  onDmUser,
  onUserClick,
  onReply,
  onPin,
  onEdited,
  onDeleted,
  reactions,
  toggleReaction,
}) {
  const [showPicker, setShowPicker] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(msg.content)

  const grouped =
    prev && prev.author_id === msg.author_id && new Date(msg.created_at) - new Date(prev.created_at) < 5 * 60 * 1000
  const isMentioned = msg.mentions?.includes(currentUserId)
  const isEveryone = msg.content?.includes('@everyone')
  const isOwn = msg.author_id === currentUserId
  const avatarUrl = msg.author?.avatar_url

  const saveEdit = async () => {
    const content = editValue.trim()
    if (!content) return
    const { error } = await supabase
      .from('messages')
      .update({ content, edited_at: new Date().toISOString() })
      .eq('id', msg.id)
    if (!error) {
      setEditing(false)
      onEdited?.({ ...msg, content, edited_at: new Date().toISOString() })
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Supprimer ce message ?')) return
    const { error } = await supabase.from('messages').delete().eq('id', msg.id)
    if (!error) onDeleted?.(msg.id)
  }

  // Regroupe les réactions par emoji
  const groupedReactions = {}
  for (const r of reactions || []) {
    if (!groupedReactions[r.emoji]) groupedReactions[r.emoji] = { count: 0, users: [], ids: [] }
    groupedReactions[r.emoji].count++
    groupedReactions[r.emoji].ids.push(r.user_id)
    if (r.user) groupedReactions[r.emoji].users.push(r.user.username)
  }

  return (
    <div
      className={`relative px-4 flex gap-3 group ${grouped ? 'py-0.5' : 'py-2 mt-2'} ${
        isMentioned || isEveryone
          ? 'bg-[var(--bg-mention)] hover:bg-[var(--bg-mention-hover)] border-l-2 border-[var(--warning)]'
          : 'hover:bg-[var(--bg-hover)]'
      }`}
    >
      {!grouped ? (
        <button
          onClick={() => onUserClick?.(msg.author)}
          className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden hover:opacity-85"
          title="Voir le profil"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            msg.author?.username?.slice(0, 2).toUpperCase() || '??'
          )}
        </button>
      ) : (
        <div className="w-10 shrink-0" />
      )}

      <div className="min-w-0 flex-1">
        {!grouped && (
          <div className="flex items-baseline gap-2">
            <button
              onClick={() => onUserClick?.(msg.author)}
              className="text-[var(--text-primary)] font-medium text-[15px] hover:underline"
              title="Voir le profil"
            >
              {msg.author?.username || 'Utilisateur'}
            </button>
            <span className="text-xs text-[var(--text-muted)]">{formatTime(msg.created_at)}</span>
            {msg.edited_at && <span className="text-xs text-[var(--text-muted)] italic">(modifié)</span>}
          </div>
        )}

        {/* Citation de la réponse */}
        {replyTo && (
          <button
            onClick={() => onReply?.(replyTo)}
            className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] mb-0.5 max-w-full truncate"
            title="Voir le message d'origine"
          >
            <CornerUpLeft size={11} className="shrink-0" />
            <span className="text-[var(--text-link)] font-medium shrink-0">@{replyTo.author?.username || 'Utilisateur'}</span>
            <span className="truncate">{replyTo.content?.slice(0, 60)}</span>
          </button>
        )}

        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full bg-[var(--bg-input)] text-[var(--text-secondary)] rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
              rows={2}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={saveEdit} className="text-xs bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded px-3 py-1.5">
                Enregistrer
              </button>
              <button onClick={() => { setEditing(false); setEditValue(msg.content) }} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] px-2">
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-[var(--text-secondary)] text-[15px] break-words whitespace-pre-wrap">
              {renderMarkdown(msg.content)}
            </p>
            {(msg.attachments || []).map((att, i) => (
              <Attachment key={i} att={att} />
            ))}
          </>
        )}

        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(groupedReactions).map(([emoji, r]) => {
              const reacted = r.ids.includes(currentUserId)
              return (
                <button
                  key={emoji}
                  className={`reaction-pill ${reacted ? 'reacted' : ''}`}
                  onClick={() => toggleReaction?.(msg.id, emoji)}
                  title={r.users.join(', ') || `${r.count} réaction(s)`}
                >
                  <span>{emoji}</span>
                  <span>{r.count}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="msg-hover-actions">
        <div className="relative">
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            title="Réagir"
          >
            <Smile size={16} />
          </button>
          {showPicker && (
            <EmojiPicker
              onPick={(emoji) => {
                toggleReaction?.(msg.id, emoji)
                setShowPicker(false)
              }}
            />
          )}
        </div>
        <button
          onClick={() => onReply?.(msg)}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          title="Répondre"
        >
          <CornerUpLeft size={16} />
        </button>
        <button
          onClick={() => onOpenThread?.(msg)}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          title="Créer un fil de discussion"
        >
          <MessageSquarePlus size={16} />
        </button>
        <button
          onClick={() => onDmUser?.(msg.author_id)}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          title="Message privé"
        >
          <MessageCircle size={16} />
        </button>
        {canPin && (
          <button
            onClick={() => onPin?.(msg)}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            title="Épingler le message"
          >
            <Pin size={16} />
          </button>
        )}
        {isOwn && (
          <button
            onClick={() => setEditing(true)}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            title="Modifier"
          >
            <Pencil size={16} />
          </button>
        )}
        {(isOwn || canModerate) && (
          <button
            onClick={handleDelete}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--danger)]"
            title="Supprimer"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
