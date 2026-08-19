import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { safeQuery } from './useSchema'

export function useMessages(channelId) {
  const { session } = useAuth()
  const uid = useRef(Math.random().toString(36).slice(2, 8)).current
  const [messages, setMessages] = useState([])
  const [reactions, setReactions] = useState({}) // messageId -> [reaction]
  const [replyTargets, setReplyTargets] = useState({}) // messageId -> message cible
  const [pins, setPins] = useState([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)

  const fetchMessages = useCallback(async () => {
    if (!channelId) return
    setLoading(true)
    const { data } = await safeQuery(
      supabase
        .from('messages')
        .select('*, author:profiles(id, username, avatar_url)')
        .eq('channel_id', channelId)
        .is('thread_id', null)
        .order('created_at', { ascending: true })
        .limit(300)
    )
    setMessages(data || [])
    setLoading(false)
  }, [channelId])

  // Charge les cibles des réponses (message cité)
  const fetchReplyTargets = useCallback(async () => {
    if (!channelId) return
    const ids = messages.filter((m) => m.reply_to_id).map((m) => m.reply_to_id)
    if (!ids.length) return
    const { data } = await safeQuery(
      supabase
        .from('messages')
        .select('id, content, author_id, author:profiles(id, username, avatar_url)')
        .in('id', ids)
    )
    const map = {}
    for (const m of data || []) map[m.id] = m
    setReplyTargets(map)
  }, [channelId, messages])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    if (messages.length) fetchReplyTargets()
  }, [messages, fetchReplyTargets])

  // Charge les réactions de tous les messages du salon en une requête
  const fetchReactions = useCallback(async () => {
    if (!channelId) return
    const { data } = await safeQuery(
      supabase
        .from('reactions')
        .select('message_id, emoji, user_id, user:profiles(username)')
        .in(
          'message_id',
          messages.map((m) => m.id)
        )
    )
    const map = {}
    for (const r of data || []) {
      if (!map[r.message_id]) map[r.message_id] = []
      map[r.message_id].push(r)
    }
    setReactions(map)
  }, [channelId, messages])

  useEffect(() => {
    if (messages.length) fetchReactions()
    else setReactions({})
  }, [messages, fetchReactions])

  // Épingles du salon
  const fetchPins = useCallback(async () => {
    if (!channelId) return
    const { data } = await safeQuery(
      supabase
        .from('pins')
        .select('message_id, created_at, message:messages(id, content, created_at, author:profiles(id, username, avatar_url))')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
    )
    setPins((data || []).map((p) => p.message).filter(Boolean))
  }, [channelId])

  useEffect(() => {
    fetchPins()
  }, [fetchPins])

  // Abonnement temps réel : nouveaux messages + réactions + épingles
  useEffect(() => {
    if (!channelId) return
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    const sub = supabase
      .channel(`messages:${channelId}-${uid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          if (payload.new.thread_id) return // les réponses de fils sont gérées par useThreads
          const { data: author } = await safeQuery(
            supabase.from('profiles').select('id, username, avatar_url').eq('id', payload.new.author_id).single()
          )
          setMessages((prev) => [...prev, { ...payload.new, author }])
          if (payload.new.reply_to_id) {
            const { data: target } = await safeQuery(
              supabase
                .from('messages')
                .select('id, content, author_id, author:profiles(id, username, avatar_url)')
                .eq('id', payload.new.reply_to_id)
                .single()
            )
            if (target) setReplyTargets((prev) => ({ ...prev, [target.id]: target }))
          }
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` }, (payload) => {
        setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m)))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` }, (payload) => {
        setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
      })
      .subscribe()

    channelRef.current = sub

    const reactionsSub = supabase
      .channel(`reactions:${channelId}-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => fetchReactions())
      .subscribe()

    const pinsSub = supabase
      .channel(`pins:${channelId}-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pins', filter: `channel_id=eq.${channelId}` }, fetchPins)
      .subscribe()

    return () => {
      supabase.removeChannel(sub)
      supabase.removeChannel(reactionsSub)
      supabase.removeChannel(pinsSub)
    }
  }, [channelId, fetchReactions, fetchPins, uid])

  const sendMessage = async (content, attachments = [], replyToId = null) => {
    if (!session?.user || !content.trim()) return { error: null }

    const mentionMatches = [...content.matchAll(/@(\w+)/g)].map((m) => m[1])
    let mentionIds = []
    if (mentionMatches.length > 0) {
      const { data: mentionedUsers } = await safeQuery(
        supabase.from('profiles').select('id, username').in('username', mentionMatches)
      )
      mentionIds = (mentionedUsers || []).map((u) => u.id)
    }

    // @everyone : mentionne tous les membres du serveur du salon
    if (content.includes('@everyone')) {
      const { data: ch } = await safeQuery(supabase.from('channels').select('server_id').eq('id', channelId).single())
      if (ch?.server_id) {
        const { data: members } = await safeQuery(
          supabase.from('server_members').select('user_id').eq('server_id', ch.server_id)
        )
        mentionIds = [...new Set([...mentionIds, ...(members || []).map((m) => m.user_id)])]
      }
    }

    const { error } = await supabase.from('messages').insert({
      channel_id: channelId,
      author_id: session.user.id,
      content: content.trim(),
      mentions: mentionIds,
      attachments,
      reply_to_id: replyToId,
    })
    return { error }
  }

  const editMessage = async (messageId, content) => {
    const { error } = await supabase
      .from('messages')
      .update({ content, edited_at: new Date().toISOString() })
      .eq('id', messageId)
    return { error }
  }

  const deleteMessage = async (messageId) => {
    const { error } = await supabase.from('messages').delete().eq('id', messageId)
    return { error }
  }

  const toggleReaction = async (messageId, emoji) => {
    if (!session?.user) return
    const list = reactions[messageId] || []
    const mine = list.find((r) => r.user_id === session.user.id && r.emoji === emoji)
    if (mine) {
      await supabase.from('reactions').delete().eq('message_id', messageId).eq('user_id', session.user.id).eq('emoji', emoji)
    } else {
      await supabase.from('reactions').insert({ message_id: messageId, user_id: session.user.id, emoji })
    }
    fetchReactions()
  }

  const pinMessage = async (messageId) => {
    if (!session?.user) return { error: null }
    const { error } = await supabase.from('pins').insert({
      message_id: messageId,
      channel_id: channelId,
      pinned_by: session.user.id,
    })
    if (!error) fetchPins()
    return { error }
  }

  const unpinMessage = async (messageId) => {
    const { error } = await supabase.from('pins').delete().eq('message_id', messageId)
    if (!error) fetchPins()
    return { error }
  }

  return {
    messages,
    reactions,
    replyTargets,
    pins,
    loading,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    pinMessage,
    unpinMessage,
    fetchPins,
  }
}
