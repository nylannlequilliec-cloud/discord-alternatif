import { useEffect, useState, useCallback, useRef } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { safeQuery } from '../hooks/useSchema'

const STATUS_LABELS = {
  online: 'En ligne',
  idle: 'Absent',
  dnd: 'Ne pas déranger',
  offline: 'Hors ligne',
}

const STATUS_COLORS = { online: '#23a55a', idle: '#f0b232', dnd: '#ed4245', offline: '#80848e' }

// Cloche de notifications (mentions + messages privés), temps réel
export default function NotificationsBell({ onOpenDm, onOpenMention }) {
  const { session } = useAuth()
  const uid = useRef(Math.random().toString(36).slice(2, 8)).current
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return
    const { data } = await safeQuery(
      supabase
        .from('notifications')
        .select('id, message_id, type, read, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(30)
    )
    if (!data) return

    const mentions = data.filter((n) => n.type !== 'dm').map((n) => n.message_id)
    const dms = data.filter((n) => n.type === 'dm').map((n) => n.message_id)

    const enriched = {}
    if (mentions.length) {
      const { data: msgs } = await safeQuery(
        supabase
          .from('messages')
          .select('id, content, author:profiles(id, username, avatar_url), channel:channels(id, name, server_id)')
          .in('id', mentions)
      )
      for (const m of msgs || []) enriched[m.id] = { kind: 'mention', ...m }
    }
    if (dms.length) {
      const { data: msgs } = await safeQuery(
        supabase
          .from('dm_messages')
          .select('id, content, conversation_id, author:profiles(id, username, avatar_url)')
          .in('id', dms)
      )
      for (const m of msgs || []) enriched[m.id] = { kind: 'dm', ...m }
    }

    setItems(
      data.map((n) => ({ ...n, meta: enriched[n.message_id] })).filter((n) => n.meta || !n.read)
    )
    setLoading(false)
  }, [session])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Temps réel
  useEffect(() => {
    if (!session?.user) return
    const sub = supabase
      .channel(`notif-bell-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, fetchNotifications)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [session, fetchNotifications])

  const unread = items.filter((n) => !n.read).length

  const markAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('user_id', session.user.id).eq('read', false)
    fetchNotifications()
  }

  const handleClick = async (item) => {
    setOpen(false)
    if (item.meta?.kind === 'dm') {
      await supabase.from('notifications').update({ read: true }).eq('id', item.id)
      onOpenDm?.(item.meta.author.id)
    } else if (item.meta?.channel) {
      await supabase.from('notifications').update({ read: true }).eq('id', item.id)
      onOpenMention?.(item.meta.channel.server_id, item.meta.channel.id)
    }
    fetchNotifications()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-11 h-11 rounded-3xl bg-[var(--bg-tertiary)] hover:rounded-2xl hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center justify-center transition-all relative"
        title="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-[var(--danger)] text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-14 w-80 bg-[var(--bg-modal)] border border-[var(--border)] rounded-lg shadow-2xl z-50 overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border)]">
              <span className="text-[var(--text-primary)] font-semibold text-sm">Notifications</span>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-[var(--text-link)] hover:underline">
                  Tout marquer comme lu
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {!loading && items.length === 0 && (
                <p className="text-sm text-[var(--text-muted)] text-center py-8 px-4">Aucune notification</p>
              )}
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full flex gap-3 px-4 py-3 text-left hover:bg-[var(--bg-hover)] ${n.read ? 'opacity-60' : ''}`}
                >
                  <div className="w-9 h-9 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                    {n.meta?.author?.avatar_url ? (
                      <img src={n.meta.author.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      n.meta?.author?.username?.slice(0, 2).toUpperCase() || '??'
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-[var(--text-secondary)]">
                      <span className="font-medium text-[var(--text-primary)]">{n.meta?.author?.username}</span>{' '}
                      {n.meta?.kind === 'dm' ? 't\'a envoyé un message privé' : 't\'a mentionné'}
                      {n.meta?.kind === 'mention' && n.meta?.channel && (
                        <span className="text-[var(--text-muted)]"> dans #{n.meta.channel.name}</span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] truncate">{n.meta?.content}</p>
                  </div>
                  {!n.read && <span className="ml-auto w-2 h-2 rounded-full bg-[var(--accent)] shrink-0 mt-1.5" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export { STATUS_LABELS, STATUS_COLORS }
