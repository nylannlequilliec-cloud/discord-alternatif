import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function MemberList({ serverId }) {
  const [members, setMembers] = useState([])

  useEffect(() => {
    if (!serverId) return
    let active = true

    supabase
      .from('server_members')
      .select('role, profile:profiles(id, username, status)')
      .eq('server_id', serverId)
      .then(({ data }) => {
        if (active && data) setMembers(data)
      })

    const sub = supabase
      .channel(`members:${serverId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'server_members', filter: `server_id=eq.${serverId}` }, () => {
        supabase
          .from('server_members')
          .select('role, profile:profiles(id, username, status)')
          .eq('server_id', serverId)
          .then(({ data }) => active && data && setMembers(data))
      })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(sub)
    }
  }, [serverId])

  return (
    <div className="w-60 bg-[#2b2d31] shrink-0 overflow-y-auto py-4 px-2 hidden lg:block">
      <p className="text-xs font-semibold text-[#949ba4] uppercase px-2 mb-2">
        Membres — {members.length}
      </p>
      {members.map((m) => (
        <div key={m.profile?.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#35373c]">
          <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {m.profile?.username?.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-sm text-[#949ba4] truncate">{m.profile?.username}</span>
          {m.role === 'owner' && <span className="text-xs text-[#f0b232] ml-auto">👑</span>}
        </div>
      ))}
    </div>
  )
}
