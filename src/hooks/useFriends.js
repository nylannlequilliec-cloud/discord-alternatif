import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { safeQuery } from './useSchema'

// Système d'amis : liste, demandes reçues/envoyées, ajout par pseudo
export function useFriends() {
  const { session } = useAuth()
  const me = session?.user?.id
  const uid = useRef(Math.random().toString(36).slice(2, 8)).current
  const [friends, setFriends] = useState([]) // acceptés, avec profil complet
  const [requests, setRequests] = useState([]) // reçues (en attente)
  const [sent, setSent] = useState([]) // envoyées (en attente)
  const [error, setError] = useState('')

  const fetchAll = useCallback(async () => {
    if (!me) return
    const { data } = await safeQuery(
      supabase
        .from('friends')
        .select('id, user_id, friend_id, status, user:profiles!friends_user_id_fkey(id, username, avatar_url, status, custom_status), friend:profiles!friends_friend_id_fkey(id, username, avatar_url, status, custom_status)')
        .or(`user_id.eq.${me},friend_id.eq.${me}`)
    )
    if (!data) return

    const accepted = []
    const incoming = []
    const outgoing = []
    for (const row of data) {
      const other = row.user_id === me ? row.friend : row.user
      const entry = { ...other, friendshipId: row.id }
      if (row.status === 'accepted') accepted.push(entry)
      else if (row.user_id === me) outgoing.push(entry)
      else incoming.push(entry)
    }
    setFriends(accepted)
    setRequests(incoming)
    setSent(outgoing)
  }, [me])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Temps réel sur les relations (les deux sens)
  useEffect(() => {
    if (!me) return
    const subs = [
      supabase
        .channel(`friends-sent-${uid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friends', filter: `user_id=eq.${me}` }, fetchAll)
        .subscribe(),
      supabase
        .channel(`friends-recv-${uid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friends', filter: `friend_id=eq.${me}` }, fetchAll)
        .subscribe(),
    ]
    return () => subs.forEach((s) => supabase.removeChannel(s))
  }, [me, uid, fetchAll])

  const addFriend = useCallback(
    async (username) => {
      setError('')
      const { error } = await supabase.rpc('add_friend', { target_username: username.trim() })
      if (error) setError(error.message || 'Impossible d\'ajouter cet utilisateur')
      else fetchAll()
      return { error }
    },
    [fetchAll]
  )

  const accept = useCallback(
    async (friendId) => {
      await supabase.rpc('accept_friend', { friend_uid: friendId })
      fetchAll()
    },
    [fetchAll]
  )

  const decline = useCallback(
    async (friendId) => {
      await supabase.rpc('decline_friend', { friend_uid: friendId })
      fetchAll()
    },
    [fetchAll]
  )

  return { friends, requests, sent, error, addFriend, accept, decline, refresh: fetchAll }
}
