import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { safeQuery } from './useSchema'

export function useServers() {
  const { session } = useAuth()
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchServers = useCallback(async () => {
    if (!session?.user) return
    setLoading(true)
    const { data } = await safeQuery(
      supabase
        .from('server_members')
        .select('server:servers(id, name, icon_url, owner_id, invite_code)')
        .eq('user_id', session.user.id)
    )
    if (data) {
      setServers(data.map((row) => row.server).filter(Boolean))
    }
    setLoading(false)
  }, [session])

  useEffect(() => {
    fetchServers()
  }, [fetchServers])

  const uploadServerIcon = async (serverId, file) => {
    if (!file) return null
    const path = `server-icons/${serverId}.${file.name.split('.').pop() || 'png'}`
    const { error } = await supabase.storage.from('files').upload(path, file, { upsert: true })
    if (error) return null
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/files/${path}`
  }

  const createServer = async (name, iconFile = null) => {
    if (!session?.user) return { error: 'Non connecté' }
    const { data, error } = await supabase
      .from('servers')
      .insert({ name, owner_id: session.user.id })
      .select()
      .single()
    if (error) return { data, error }

    if (iconFile && data?.id) {
      const iconUrl = await uploadServerIcon(data.id, iconFile)
      if (iconUrl) {
        await supabase.from('servers').update({ icon_url: iconUrl }).eq('id', data.id)
        data.icon_url = iconUrl
      }
    }
    await fetchServers()
    return { data, error: null }
  }

  const updateServer = async (serverId, patch) => {
    const { error } = await supabase.from('servers').update(patch).eq('id', serverId)
    if (!error) await fetchServers()
    return { error }
  }

  const changeServerIcon = async (serverId, file) => {
    const iconUrl = await uploadServerIcon(serverId, file)
    if (!iconUrl) return { error: { message: 'Impossible de téléverser l\'icône' } }
    return updateServer(serverId, { icon_url: iconUrl })
  }

  const deleteServer = async (serverId) => {
    const { error } = await supabase.from('servers').delete().eq('id', serverId)
    if (!error) await fetchServers()
    return { error }
  }

  const leaveServer = async (serverId) => {
    const { error } = await supabase
      .from('server_members')
      .delete()
      .eq('server_id', serverId)
      .eq('user_id', session.user.id)
    if (!error) await fetchServers()
    return { error }
  }

  const transferOwnership = async (serverId, newOwnerId) => {
    if (!session?.user) return { error: 'Non connecté' }
    // Le nouveau propriétaire devient owner, l'ancien devient admin
    const { error: e1 } = await supabase.from('servers').update({ owner_id: newOwnerId }).eq('id', serverId)
    if (e1) return { error: e1 }
    await supabase.from('server_members').update({ role: 'admin' }).eq('server_id', serverId).eq('user_id', session.user.id)
    await supabase.from('server_members').update({ role: 'owner' }).eq('server_id', serverId).eq('user_id', newOwnerId)
    await fetchServers()
    return { error: null }
  }

  const joinServer = async (inviteCode) => {
    if (!session?.user) return { error: 'Non connecté' }
    const { data: server, error: findError } = await supabase
      .from('servers')
      .select('id')
      .eq('invite_code', inviteCode.trim().toLowerCase())
      .maybeSingle()

    if (findError || !server) {
      return { error: "Code d'invitation invalide" }
    }

    const { error: joinError } = await supabase
      .from('server_members')
      .insert({ server_id: server.id, user_id: session.user.id })

    if (!joinError) await fetchServers()
    return { error: joinError }
  }

  return {
    servers,
    loading,
    createServer,
    joinServer,
    updateServer,
    changeServerIcon,
    deleteServer,
    leaveServer,
    transferOwnership,
    refresh: fetchServers,
  }
}
