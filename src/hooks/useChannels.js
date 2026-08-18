import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useChannels(serverId) {
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchChannels = useCallback(async () => {
    if (!serverId) return
    setLoading(true)
    const { data } = await supabase
      .from('channels')
      .select('*')
      .eq('server_id', serverId)
      .order('position', { ascending: true })
    setChannels(data || [])
    setLoading(false)
  }, [serverId])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  const createChannel = async (name, type = 'text') => {
    const { data, error } = await supabase
      .from('channels')
      .insert({ server_id: serverId, name, type })
      .select()
      .single()
    if (!error) await fetchChannels()
    return { data, error }
  }

  const renameChannel = async (channelId, name) => {
    const { error } = await supabase.from('channels').update({ name }).eq('id', channelId)
    if (!error) await fetchChannels()
    return { error }
  }

  const deleteChannel = async (channelId) => {
    const { error } = await supabase.from('channels').delete().eq('id', channelId)
    if (!error) await fetchChannels()
    return { error }
  }

  return { channels, loading, createChannel, renameChannel, deleteChannel, refresh: fetchChannels }
}
