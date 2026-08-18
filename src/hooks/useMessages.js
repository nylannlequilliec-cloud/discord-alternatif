import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useMessages(channelId) {
  const { session, profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)

  const fetchMessages = useCallback(async () => {
    if (!channelId) return
    setLoading(true)
    const { data } = await supabase
      .from('messages')
      .select('*, author:profiles(id, username, avatar_url)')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(200)
    setMessages(data || [])
    setLoading(false)
  }, [channelId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Abonnement temps réel : nouveaux messages dans ce salon
  useEffect(() => {
    if (!channelId) return

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const sub = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          // On récupère l'auteur pour l'afficher correctement
          const { data: author } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', payload.new.author_id)
            .single()
          setMessages((prev) => [...prev, { ...payload.new, author }])
        }
      )
      .subscribe()

    channelRef.current = sub

    return () => {
      supabase.removeChannel(sub)
    }
  }, [channelId])

  const sendMessage = async (content) => {
    if (!session?.user || !content.trim()) return

    // Détection simple des mentions @pseudo
    const mentionMatches = [...content.matchAll(/@(\w+)/g)].map((m) => m[1])
    let mentionIds = []
    if (mentionMatches.length > 0) {
      const { data: mentionedUsers } = await supabase
        .from('profiles')
        .select('id, username')
        .in('username', mentionMatches)
      mentionIds = (mentionedUsers || []).map((u) => u.id)
    }

    const { error } = await supabase.from('messages').insert({
      channel_id: channelId,
      author_id: session.user.id,
      content: content.trim(),
      mentions: mentionIds,
    })
    return { error }
  }

  return { messages, loading, sendMessage }
}
