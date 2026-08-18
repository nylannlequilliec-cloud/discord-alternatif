import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useServers } from '../hooks/useServers'
import { useChannels } from '../hooks/useChannels'
import ServerBar from '../components/ServerBar'
import ChannelSidebar from '../components/ChannelSidebar'
import ChatArea from '../components/ChatArea'
import MemberList from '../components/MemberList'

export default function Home() {
  const { session, profile, signOut } = useAuth()
  const { servers, createServer, joinServer } = useServers()
  const [activeServerId, setActiveServerId] = useState(null)
  const [activeChannel, setActiveChannel] = useState(null)

  const { channels, createChannel } = useChannels(activeServerId)

  // Sélectionne automatiquement le premier serveur / salon dispo
  useEffect(() => {
    if (!activeServerId && servers.length > 0) {
      setActiveServerId(servers[0].id)
    }
  }, [servers, activeServerId])

  useEffect(() => {
    setActiveChannel(null)
  }, [activeServerId])

  useEffect(() => {
    if (!activeChannel && channels.length > 0) {
      const firstText = channels.find((c) => c.type === 'text')
      if (firstText) setActiveChannel(firstText)
    }
  }, [channels, activeChannel])

  const activeServer = servers.find((s) => s.id === activeServerId)

  return (
    <div className="h-screen w-screen flex overflow-hidden">
      <ServerBar
        servers={servers}
        activeServerId={activeServerId}
        onSelectServer={setActiveServerId}
        onCreateServer={createServer}
        onJoinServer={joinServer}
      />

      {activeServer ? (
        <>
          <ChannelSidebar
            server={activeServer}
            channels={channels}
            activeChannelId={activeChannel?.id}
            onSelectChannel={setActiveChannel}
            onCreateChannel={createChannel}
            profile={profile}
            onSignOut={signOut}
          />
          <ChatArea channel={activeChannel} currentUserId={session?.user?.id} />
          <MemberList serverId={activeServerId} />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[#313338] text-[#949ba4] text-center px-6">
          <div>
            <p className="text-lg mb-2">Aucun serveur pour l'instant</p>
            <p className="text-sm">Clique sur le + à gauche pour en créer un ou en rejoindre un</p>
          </div>
        </div>
      )}
    </div>
  )
}
