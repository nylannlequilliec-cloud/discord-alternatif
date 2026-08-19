import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { safeQuery } from './useSchema'

// Fils de discussion : liste des fils actifs d'un salon + réponses d'un fil
// `disabled` : quand l'instance parente (Home) fournit déjà les données
export function useThreads(channelId, { disabled = false } = {}) {
  const uid = useRef(Math.random().toString(36).slice(2, 8)).current
  const [threads, setThreads] = useState([]) // messages parents ayant des réponses
  const [replies, setReplies] = useState([]) // réponses du fil ouvert
  const [activeThread, setActiveThread] = useState(null) // id du message parent

  const fetchThreads = useCallback(async () => {
    if (!channelId) return
    const { data } = await safeQuery(
      supabase
        .from('messages')
        .select('thread_id')
        .eq('channel_id', channelId)
        .not('thread_id', 'is', null)
        .limit(200)
    )
    if (!data?.length) {
      setThreads([])
      return
    }
    const parentIds = [...new Set(data.map((m) => m.thread_id))]
    const { data: parents } = await safeQuery(
      supabase
        .from('messages')
        .select('id, content, created_at, author:profiles(id, username, avatar_url)')
        .in('id', parentIds)
        .order('created_at', { ascending: false })
    )
    setThreads(parents || [])
  }, [channelId])

  useEffect(() => {
    if (disabled) return
    fetchThreads()
    if (!channelId) {
      setActiveThread(null)
      setReplies([])
    }
  }, [channelId, fetchThreads, disabled])

  // Attention à l'ORDRE : loadReplies doit être déclaré AVANT l'effet temps réel
  // qui le référence dans ses dépendances (sinon erreur TDZ au rendu)
  const loadReplies = useCallback(async (parentId) => {
    const { data } = await safeQuery(
      supabase
        .from('messages')
        .select('*, author:profiles(id, username, avatar_url)')
        .eq('thread_id', parentId)
        .order('created_at', { ascending: true })
        .limit(200)
    )
    setReplies(data || [])
  }, [])

  // Temps réel : une nouvelle réponse = le fil remonte
  useEffect(() => {
    if (disabled || !channelId) return
    const sub = supabase
      .channel(`threads:${channelId}-${uid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        (payload) => {
          if (payload.new.thread_id) fetchThreads()
          if (activeThread && payload.new.thread_id === activeThread) {
            loadReplies(activeThread)
          }
        }
      )
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [channelId, activeThread, fetchThreads, loadReplies, disabled, uid])

  const openThread = useCallback(
    async (parentId) => {
      setActiveThread(parentId)
      await loadReplies(parentId)
    },
    [loadReplies]
  )

  const closeThread = useCallback(() => {
    setActiveThread(null)
    setReplies([])
  }, [])

  const reply = useCallback(
    async (content) => {
      if (!activeThread || !content.trim()) return { error: 'Aucun fil ouvert' }
      const { error } = await supabase.from('messages').insert({
        channel_id: channelId,
        thread_id: activeThread,
        content: content.trim(),
      })
      return { error }
    },
    [activeThread, channelId]
  )

  return { threads, replies, activeThread, openThread, closeThread, reply, fetchThreads }
}
