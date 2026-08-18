import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from './useAuth'

// Salons vocaux + partage d'écran via LiveKit (LiveKit Cloud gratuit)
// livekit-client est chargé à la demande pour garder le bundle initial léger.
export function useVoice() {
  const { session, profile } = useAuth()
  const roomRef = useRef(null)
  const [roomState, setRoomState] = useState({
    connected: false,
    channel: null,
    participants: [],
    error: null,
    configMissing: false,
    connecting: false,
  })

  const syncParticipants = useCallback(() => {
    const room = roomRef.current
    if (!room) return
    const list = [...room.participants.values()].map((p) => ({
      identity: p.identity,
      name: p.name || p.identity,
      isLocal: false,
      isSpeaking: p.isSpeaking,
      isMuted: !p.isMicrophoneEnabled,
      isCameraEnabled: p.isCameraEnabled,
      isScreenShare: p.isScreenShareEnabled,
    }))
    if (room.localParticipant) {
      list.push({
        identity: room.localParticipant.identity,
        name: profile?.username || room.localParticipant.identity,
        isLocal: true,
        isSpeaking: room.localParticipant.isSpeaking,
        isMuted: !room.localParticipant.isMicrophoneEnabled,
        isCameraEnabled: room.localParticipant.isCameraEnabled,
        isScreenShare: room.localParticipant.isScreenShareEnabled,
      })
    }
    setRoomState((s) => ({ ...s, participants: list }))
  }, [profile])

  const leave = useCallback(async () => {
    const room = roomRef.current
    roomRef.current = null
    if (room) {
      room.removeAllListeners()
      await room.disconnect()
    }
    setRoomState({ connected: false, channel: null, participants: [], error: null, configMissing: false, connecting: false })
  }, [])

  const join = useCallback(
    async (channel) => {
      // L'URL LiveKit est fournie par le serveur (GET /api/livekit-token)
      let livekitUrl = null
      try {
        const res = await fetch('/api/livekit-token')
        if (res.ok) {
          const info = await res.json()
          livekitUrl = info.url || null
          if (!info.configured) {
            setRoomState((s) => ({ ...s, configMissing: true, channel }))
            return { error: { message: 'LiveKit non configuré' } }
          }
        }
      } catch {
        /* serveur injoignable */
      }
      if (!livekitUrl) {
        setRoomState((s) => ({ ...s, configMissing: true, channel }))
        return { error: { message: 'LiveKit non configuré' } }
      }
      if (roomRef.current) await leave()

      setRoomState((s) => ({ ...s, connecting: true, error: null, configMissing: false, channel }))
      try {
        const { Room, RoomEvent } = await import('livekit-client')

        const tokenRes = await fetch('/api/livekit-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: `serveur-${channel.server_id}-${channel.id}`, identity: session?.user?.id }),
        })
        if (!tokenRes.ok) throw new Error('Token LiveKit indisponible')
        const { token } = await tokenRes.json()

        const room = new Room({ adaptiveStream: true, dynacast: true })
        roomRef.current = room

        room.on(RoomEvent.ParticipantConnected, syncParticipants)
        room.on(RoomEvent.ParticipantDisconnected, syncParticipants)
        room.on(RoomEvent.ActiveSpeakersChanged, syncParticipants)
        room.on(RoomEvent.TrackMuted, syncParticipants)
        room.on(RoomEvent.TrackUnmuted, syncParticipants)
        room.on(RoomEvent.LocalTrackPublished, syncParticipants)
        room.on(RoomEvent.LocalTrackUnpublished, syncParticipants)
        room.on(RoomEvent.Disconnected, () => {
          roomRef.current = null
          setRoomState((s) => ({ ...s, connected: false, channel: null, participants: [] }))
        })

        await room.connect(livekitUrl, token)
        await room.localParticipant.setMicrophoneEnabled(true)
        setRoomState((s) => ({ ...s, connected: true, connecting: false }))
        syncParticipants()
        return { error: null }
      } catch (e) {
        roomRef.current = null
        setRoomState((s) => ({ ...s, connecting: false, error: e.message || 'Impossible de rejoindre le salon vocal' }))
        return { error: { message: e.message || 'Erreur vocale' } }
      }
    },
    [session, syncParticipants, leave]
  )

  const toggleMute = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    const enabled = room.localParticipant.isMicrophoneEnabled
    await room.localParticipant.setMicrophoneEnabled(!enabled)
    syncParticipants()
  }, [syncParticipants])

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    const enabled = room.localParticipant.isCameraEnabled
    await room.localParticipant.setCameraEnabled(!enabled)
    syncParticipants()
  }, [syncParticipants])

  const toggleScreenShare = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    const sharing = room.localParticipant.isScreenShareEnabled
    await room.localParticipant.setScreenShareEnabled(!sharing)
    syncParticipants()
  }, [syncParticipants])

  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect().catch(() => {})
      }
    }
  }, [])

  return { ...roomState, join, leave, toggleMute, toggleCamera, toggleScreenShare }
}
