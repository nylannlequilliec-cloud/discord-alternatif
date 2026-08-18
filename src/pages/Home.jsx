import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useServers } from '../hooks/useServers'
import { useChannels } from '../hooks/useChannels'
import { useDMs } from '../hooks/useDMs'
import { useThreads } from '../hooks/useThreads'
import { useMembers } from '../hooks/useMembers'
import { useVoice } from '../hooks/useVoice'
import { useSchemaProbe } from '../hooks/useSchema'
import { useUI } from '../context/UIContext'
import ServerBar from '../components/ServerBar'
import ChannelSidebar from '../components/ChannelSidebar'
import ChatArea from '../components/ChatArea'
import MemberList from '../components/MemberList'
import DMPanel from '../components/DMPanel'
import SettingsModal from '../components/SettingsModal'
import VoicePanel from '../components/VoicePanel'
import UIBox from '../components/UIBox'
import { UICustomizerBar, PropertiesPanel } from '../components/UICustomizerBar'

export default function Home() {
  const { session, profile, signOut } = useAuth()
  const { servers, createServer, joinServer } = useServers()
  const [view, setView] = useState('server') // 'server' | 'dm'
  const [activeServerId, setActiveServerId] = useState(null)
  const [activeChannel, setActiveChannel] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [v2BannerDismissed, setV2BannerDismissed] = useState(false)
  const pendingChannelRef = useRef(null)
  const { editMode, setEditMode } = useUI()
  const voice = useVoice()
  const v2 = useSchemaProbe()
  const dms = useDMs()

  const { channels, createChannel, renameChannel, deleteChannel } = useChannels(activeServerId)
  const threads = useThreads(activeChannel?.id)
  const { myRole, canModerate } = useMembers(activeServerId)

  // Sélectionne automatiquement le premier serveur
  useEffect(() => {
    if (view === 'server' && !activeServerId && servers.length > 0) {
      setActiveServerId(servers[0].id)
    }
  }, [servers, activeServerId, view])

  // Reset du salon quand on change de serveur
  useEffect(() => {
    setActiveChannel(null)
    pendingChannelRef.current = null
  }, [activeServerId])

  // Sélection du premier salon textuel, ou du salon demandé via une notification
  useEffect(() => {
    if (pendingChannelRef.current) {
      const c = channels.find((ch) => ch.id === pendingChannelRef.current)
      if (c) {
        setActiveChannel(c)
        pendingChannelRef.current = null
        return
      }
    }
    if (!activeChannel && channels.length > 0) {
      const firstText = channels.find((c) => c.type === 'text')
      if (firstText) setActiveChannel(firstText)
    }
  }, [channels, activeChannel])

  const activeServer = servers.find((s) => s.id === activeServerId)

  const handleSelectServer = (id) => {
    setActiveServerId(id)
    setView('server')
  }

  const handleOpenDm = useCallback(
    async (userId) => {
      setView('dm')
      await dms.openConversation(userId)
    },
    [dms]
  )

  const handleOpenMention = (serverId, channelId) => {
    setActiveServerId(serverId)
    setView('server')
    pendingChannelRef.current = channelId
  }

  const handleJoinVoice = async (channel) => {
    if (voice.channel?.id === channel.id) {
      await voice.leave()
      return
    }
    await voice.join(channel)
  }

  const totalDmUnread = Object.values(dms.unread).reduce((a, b) => a + b, 0)

  return (
    <div className="h-screen w-screen flex overflow-hidden relative bg-[var(--bg-primary)]">
      {v2 === false && !v2BannerDismissed && (
        <div className="fixed top-0 inset-x-0 z-[95] bg-[var(--warning)] text-[var(--bg-primary)] text-xs font-medium px-4 py-2 flex items-center justify-center gap-3">
          <span>
            🔧 Mise à jour en attente : exécute <code className="font-bold">supabase/schema_v2.sql</code> dans Supabase
            (SQL Editor) pour activer DM, fils, réactions, modération et uploads. Voir le README.
          </span>
          <button onClick={() => setV2BannerDismissed(true)} className="font-bold hover:opacity-70">✕</button>
        </div>
      )}

      <UICustomizerBar />
      <PropertiesPanel />

      <UIBox id="server-bar" className="h-full shrink-0">
        <ServerBar
          servers={servers}
          activeServerId={view === 'dm' ? null : activeServerId}
          onSelectServer={handleSelectServer}
          onCreateServer={createServer}
          onJoinServer={joinServer}
          onHome={() => setView('dm')}
          dmUnread={totalDmUnread}
          onOpenDm={handleOpenDm}
          onOpenMention={handleOpenMention}
        />
      </UIBox>

      {view === 'dm' ? (
        <DMPanel dms={dms} />
      ) : activeServer ? (
        <>
          <UIBox id="channel-sidebar" className="h-full shrink-0">
            <ChannelSidebar
              server={activeServer}
              channels={channels}
              activeChannelId={activeChannel?.id}
              onSelectChannel={setActiveChannel}
              onCreateChannel={createChannel}
              onRenameChannel={renameChannel}
              onDeleteChannel={deleteChannel}
              profile={profile}
              onSignOut={signOut}
              onOpenSettings={() => setSettingsOpen(true)}
              editMode={editMode}
              onToggleEditMode={() => setEditMode(!editMode)}
              threads={threads.threads}
              onOpenThread={(id) => threads.openThread(id)}
              onJoinVoice={handleJoinVoice}
              voiceChannelId={voice.channel?.id}
              myRole={myRole}
            />
          </UIBox>

          <ChatArea
            channel={activeChannel}
            currentUserId={session?.user?.id}
            canModerate={canModerate}
            onDmUser={handleOpenDm}
            threads={threads}
          />

          <UIBox id="member-list" className="h-full shrink-0 hidden lg:block">
            <MemberList serverId={activeServerId} onDmUser={handleOpenDm} />
          </UIBox>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[var(--bg-tertiary)] text-[var(--text-muted)] text-center px-6">
          <div>
            <p className="text-lg mb-2">Aucun serveur pour l'instant</p>
            <p className="text-sm">Clique sur le + à gauche pour en créer un ou en rejoindre un</p>
          </div>
        </div>
      )}

      <VoicePanel voice={voice} channel={voice.channel} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
