import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { safeQuery } from './useSchema'

// Messages privés : conversations, messages, temps réel, notifications
export function useDMs() {
  const { session } = useAuth()
  const me = session?.user?.id
  const [conversations, setConversations] = useState([]) // { id, other: profile, lastMessage }
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [unread, setUnread] = useState({}) // conversationId -> nb non lus
  const subsRef = useRef([])

  const fetchConversations = useCallback(async () => {
    if (!me) return
    const { data } = await safeQuery(
      supabase
        .from('dm_members')
        .select('conversation_id, user:profiles(id, username, avatar_url, status)')
        .eq('user_id', me)
        .order('created_at', { ascending: false })
    )
    if (!data) return

    const convs = []
    for (const row of data) {
      const other = row.user
      if (!other) continue
      const { data: last } = await safeQuery(
        supabase
          .from('dm_messages')
          .select('content, created_at, author_id')
          .eq('conversation_id', row.conversation_id)
          .order('created_at', { ascending: false })
          .limit(1)
      )
      convs.push({ id: row.conversation_id, other, lastMessage: last?.[0] || null })
    }
    setConversations(convs)
    setLoading(false)
  }, [me])

  const fetchUnread = useCallback(async () => {
    if (!me) return
    const { data } = await safeQuery(
      supabase
        .from('notifications')
        .select('message_id')
        .eq('user_id', me)
        .eq('type', 'dm')
        .eq('read', false)
    )
    if (!data?.length) {
      setUnread({})
      return
    }
    const ids = data.map((n) => n.message_id)
    const { data: msgs } = await safeQuery(
      supabase.from('dm_messages').select('id, conversation_id').in('id', ids)
    )
    const counts = {}
    for (const m of msgs || []) counts[m.conversation_id] = (counts[m.conversation_id] || 0) + 1
    setUnread(counts)
  }, [me])

  useEffect(() => {
    fetchConversations()
    fetchUnread()
  }, [fetchConversations, fetchUnread])

  // Temps réel : nouvelles conversations + messages
  useEffect(() => {
    if (!me) return
    const subs = [
      supabase
        .channel('dms-list')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_members', filter: `user_id=eq.${me}` }, fetchConversations)
        .subscribe(),
      supabase
        .channel('dms-unread')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${me}` }, fetchUnread)
        .subscribe(),
    ]
    subsRef.current = subs
    return () => subs.forEach((s) => supabase.removeChannel(s))
  }, [me, fetchConversations, fetchUnread])

  // Messages de la conversation active
  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    let active = true
    const load = async () => {
      const { data } = await safeQuery(
        supabase
          .from('dm_messages')
          .select('*, author:profiles(id, username, avatar_url)')
          .eq('conversation_id', activeId)
          .order('created_at', { ascending: true })
          .limit(300)
      )
      if (active) setMessages(data || [])
    }
    load()

    const sub = supabase
      .channel(`dm:${activeId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: `conversation_id=eq.${activeId}` }, async (payload) => {
        const { data: author } = await safeQuery(
          supabase.from('profiles').select('id, username, avatar_url').eq('id', payload.new.author_id).single()
        )
        if (active) setMessages((prev) => [...prev, { ...payload.new, author }])
      })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(sub)
    }
  }, [activeId])

  const openConversation = useCallback(
    async (otherUserId) => {
      if (!me) return { error: 'Non connecté' }
      const { data, error } = await supabase.rpc('get_or_create_dm', { other_user_id: otherUserId })
      if (error) return { error }
      setActiveId(data)
      await fetchConversations()
      await markRead(data)
      return { data }
    },
    [me, fetchConversations, markRead]
  )

  const markRead = useCallback(
    async (conversationId) => {
      if (!me) return
      const { data: msgs } = await safeQuery(
        supabase.from('dm_messages').select('id').eq('conversation_id', conversationId)
      )
      if (msgs?.length) {
        await safeQuery(
          supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', me)
            .eq('type', 'dm')
            .in('message_id', msgs.map((m) => m.id))
        )
        fetchUnread()
      }
    },
    [me, fetchUnread]
  )

  const sendMessage = useCallback(
    async (content, attachments = []) => {
      if (!me || !activeId) return { error: 'Aucune conversation ouverte' }
      const { error } = await supabase.from('dm_messages').insert({
        conversation_id: activeId,
        author_id: me,
        content: content.trim(),
        attachments,
      })
      return { error }
    },
    [me, activeId]
  )

  const deleteMessage = useCallback(
    async (messageId) => {
      const { error } = await supabase.from('dm_messages').delete().eq('id', messageId)
      if (!error) setMessages((prev) => prev.filter((m) => m.id !== messageId))
      return { error }
    },
    []
  )

  return {
    conversations,
    activeId,
    setActiveId,
    openConversation,
    messages,
    sendMessage,
    deleteMessage,
    unread,
    markRead,
    loading,
  }
}
