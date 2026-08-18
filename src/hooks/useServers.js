import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useServers() {
  const { session } = useAuth()
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchServers = useCallback(async () => {
    if (!session?.user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('server_members')
      .select('server:servers(id, name, icon_url, owner_id, invite_code)')
      .eq('user_id', session.user.id)

    if (!error && data) {
      setServers(data.map((row) => row.server).filter(Boolean))
    }
    setLoading(false)
  }, [session])

  useEffect(() => {
    fetchServers()
  }, [fetchServers])

  const createServer = async (name) => {
    if (!session?.user) return { error: 'Non connecté' }
    const { data, error } = await supabase
      .from('servers')
      .insert({ name, owner_id: session.user.id })
      .select()
      .single()
    if (!error) await fetchServers()
    return { data, error }
  }

  const joinServer = async (inviteCode) => {
    if (!session?.user) return { error: 'Non connecté' }
    const { data: server, error: findError } = await supabase
      .from('servers')
      .select('id')
      .eq('invite_code', inviteCode.trim())
      .single()

    if (findError || !server) {
      return { error: "Code d'invitation invalide" }
    }

    const { error: joinError } = await supabase
      .from('server_members')
      .insert({ server_id: server.id, user_id: session.user.id })

    if (!joinError) await fetchServers()
    return { error: joinError }
  }

  return { servers, loading, createServer, joinServer, refresh: fetchServers }
}
