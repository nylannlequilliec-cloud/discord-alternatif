import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { safeQuery } from './useSchema'

// Membres d'un serveur + actions de modération (ban, mute, rôles)
export function useMembers(serverId) {
  const { session } = useAuth()
  const [members, setMembers] = useState([])
  const [myRole, setMyRole] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchMembers = useCallback(async () => {
    if (!serverId) return
    const { data } = await safeQuery(
      supabase
        .from('server_members')
        .select('role, muted_until, profile:profiles(id, username, avatar_url, status)')
        .eq('server_id', serverId)
        .order('joined_at', { ascending: true })
    )
    if (data) setMembers(data)
    setLoading(false)
  }, [serverId])

  useEffect(() => {
    fetchMembers()
    setMyRole(null)
    if (serverId && session?.user) {
      safeQuery(
        supabase
          .from('server_members')
          .select('role')
          .eq('server_id', serverId)
          .eq('user_id', session.user.id)
          .maybeSingle()
      ).then(({ data }) => setMyRole(data?.role || null))
    }
  }, [serverId, session, fetchMembers])

  // Temps réel sur les membres
  useEffect(() => {
    if (!serverId) return
    const sub = supabase
      .channel(`members:${serverId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'server_members', filter: `server_id=eq.${serverId}` }, fetchMembers)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [serverId, fetchMembers])

  const canModerate = myRole === 'owner' || myRole === 'admin'

  const banMember = useCallback(
    async (userId, reason = '') => {
      if (!canModerate) return { error: 'Permissions insuffisantes' }
      const { error: banError } = await supabase
        .from('bans')
        .insert({ server_id: serverId, user_id: userId, banned_by: session?.user?.id, reason })
      if (banError) return { error: banError }
      await supabase.from('server_members').delete().eq('server_id', serverId).eq('user_id', userId)
      return { error: null }
    },
    [serverId, canModerate, session]
  )

  const unbanMember = useCallback(
    async (userId) => {
      const { error } = await supabase.from('bans').delete().eq('server_id', serverId).eq('user_id', userId)
      return { error }
    },
    [serverId]
  )

  const muteMember = useCallback(
    async (userId, minutes) => {
      if (!canModerate) return { error: 'Permissions insuffisantes' }
      const until = new Date(Date.now() + minutes * 60 * 1000).toISOString()
      const { error } = await supabase
        .from('server_members')
        .update({ muted_until: until })
        .eq('server_id', serverId)
        .eq('user_id', userId)
      return { error }
    },
    [serverId, canModerate]
  )

  const unmuteMember = useCallback(
    async (userId) => {
      const { error } = await supabase
        .from('server_members')
        .update({ muted_until: null })
        .eq('server_id', serverId)
        .eq('user_id', userId)
      return { error }
    },
    [serverId]
  )

  const setRole = useCallback(
    async (userId, role) => {
      if (myRole !== 'owner' && !(myRole === 'admin' && role === 'member')) {
        return { error: 'Permissions insuffisantes' }
      }
      const { error } = await supabase
        .from('server_members')
        .update({ role })
        .eq('server_id', serverId)
        .eq('user_id', userId)
      return { error }
    },
    [serverId, myRole]
  )

  const deleteUserMessages = useCallback(
    async (userId) => {
      if (!canModerate) return { error: 'Permissions insuffisantes' }
      const { data: channels } = await safeQuery(
        supabase.from('channels').select('id').eq('server_id', serverId)
      )
      if (!channels?.length) return { error: null }
      const channelIds = channels.map((c) => c.id)
      const { data: msgs } = await safeQuery(
        supabase.from('messages').select('id').in('channel_id', channelIds).eq('author_id', userId)
      )
      if (msgs?.length) {
        for (let i = 0; i < msgs.length; i += 50) {
          await supabase.from('messages').delete().in('id', msgs.slice(i, i + 50).map((m) => m.id))
        }
      }
      return { error: null }
    },
    [serverId, canModerate]
  )

  const kickMember = useCallback(
    async (userId) => {
      if (!canModerate) return { error: 'Permissions insuffisantes' }
      const { error } = await supabase
        .from('server_members')
        .delete()
        .eq('server_id', serverId)
        .eq('user_id', userId)
      return { error }
    },
    [serverId, canModerate]
  )

  return {
    members,
    myRole,
    loading,
    canModerate,
    banMember,
    unbanMember,
    muteMember,
    unmuteMember,
    setRole,
    deleteUserMessages,
    kickMember,
  }
}
