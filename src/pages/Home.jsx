import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useServers } from '../hooks/useServers'
import { useChannels } from '../hooks/useChannels'
import { useDMs } from '../hooks/useDMs'
import { useThreads } from '../hooks/useThreads'
import { useMembers } from '../hooks/useMembers'
import { useFriends } from '../hooks/useFriends'
import { useVoice } from '../hooks/useVoice'
import { useSchemaProbe } from '../hooks/useSchema'
import { useUI } from '../context/UIContext'
import ServerBar from '../components/ServerBar'
import ChannelSidebar from '../components/ChannelSidebar'
import ChatArea from '../components/ChatArea'
import MemberList from '../components/MemberList'
import DMPanel from '../components/DMPanel'
import SettingsModal from '../components/SettingsModal'
import ServerSettingsModal from '../components/ServerSettingsModal'
import VoicePanel from '../components/VoicePanel'
import ProfileCard from '../components/ProfileCard'
import UIBox from '../components/UIBox'
import { UICustomizerBar, PropertiesPanel } from '../components/UICustomizerBar'

export default function Home() {
  const { session, profile, signOut } = useAuth()
  const { servers, createServer, joinServer, updateServer, changeServerIcon, deleteServer, leaveServer, transferOwnership } =
    useServers()
  const [view, setView] = useState('server') // 'server' | 'dm'
  const [activeServerId, setActiveServerId] = useState(null)
  const [activeChannel, setActiveChannel] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [serverSettingsOpen, setServerSettingsOpen] = useState(false)
  const [profileUser, setProfileUser] = useState(null)
  const [v2BannerDismissed, setV2BannerDismissed] = useState(false)
  const pendingChannelRef = useRef(null)
  const { editMode, setEditMode } = useUI()
  const voice = useVoice()
  const v2 = useSchemaProbe()
  const dms = useDMs()
  const friends = useFriends()

  const { channels, createChannel, renameChannel, deleteChannel } = useChannels(activeServerId)
  const threads = useThreads(activeChannel?.id)
  const membersApi = useMembers(activeServerId)

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
    setServerSettingsOpen(false)
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
  const isFriend = (userId) => friends.friends.some((f) => f.id === userId)

  return (
    <div className="h-screen w-screen flex overflow-hidden relative bg-[var(--bg-primary)]">
      {v2 === false && !v2BannerDismissed && (
        <div className="fixed top-0 inset-x-0 z-[95] bg-[var(--warning)] text-[var(--bg-primary)] text-xs font-medium px-4 py-2 flex items-center justify-center gap-3">
          <span>
            🔧 Mise à jour en attente : exécute <code className="font-bold">supabase/schema.sql</code> dans Supabase
            (SQL Editor) pour activer serveurs, DM, amis, épingles et modération. Voir le README.
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
        <DMPanel dms={dms} onUserClick={setProfileUser} />
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
              myRole={membersApi.myRole}
              onOpenServerSettings={() => setServerSettingsOpen(true)}
            />
          </UIBox>

          <ChatArea
            channel={activeChannel}
            currentUserId={session?.user?.id}
            canModerate={membersApi.canModerate}
            canPin={membersApi.myRole === 'owner' || membersApi.myRole === 'admin'}
            onDmUser={handleOpenDm}
            onUserClick={setProfileUser}
            threads={threads}
          />

          <UIBox id="member-list" className="h-full shrink-0 hidden lg:block">
            <MemberList serverId={activeServerId} onDmUser={handleOpenDm} onUserClick={setProfileUser} membersApi={membersApi} />
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

      {serverSettingsOpen && activeServer && (
        <ServerSettingsModal
          server={activeServer}
          myRole={membersApi.myRole}
          onClose={() => setServerSettingsOpen(false)}
          onUpdate={(patch, iconFile) => (iconFile ? changeServerIcon(activeServer.id, iconFile) : updateServer(activeServer.id, patch))}
          onDelete={deleteServer}
          onLeave={leaveServer}
          onTransfer={transferOwnership}
        />
      )}

      {profileUser && (
        <ProfileCard
          user={profileUser}
          isFriend={isFriend(profileUser.id)}
          onClose={() => setProfileUser(null)}
          onDm={handleOpenDm}
          onAddFriend={(username) => {
            friends.addFriend(username)
          }}
          onRemoveFriend={(userId) => {
            friends.decline(userId)
          }}
        />
      )}
    </div>
  )
}
