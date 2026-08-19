import { Mic, MicOff, Video, MonitorUp, Volume2 } from 'lucide-react'

// Panneau flottant du salon vocal (LiveKit)
export default function VoicePanel({ voice, channel }) {
  if (!voice.connected && !voice.connecting && !voice.configMissing) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[75] bg-[var(--bg-modal)] border border-[var(--border)] rounded-xl shadow-2xl px-4 py-3 w-[380px] max-w-[95vw]">
      {voice.configMissing ? (
        <div className="text-sm text-[var(--text-muted)] text-center py-1 flex items-center justify-center gap-2">
          <Mic size={15} /> Vocal : LiveKit n'est pas encore configuré. Voir le README (section Vocal) — les clés sont gratuites.
        </div>
      ) : voice.connecting ? (
        <div className="text-sm text-[var(--text-muted)] text-center py-1">Connexion au salon vocal…</div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <Volume2 size={16} className="text-[var(--accent-green)]" /> {channel?.name}
            </span>
            <button onClick={voice.leave} className="text-xs bg-[var(--danger)] hover:opacity-80 text-white rounded px-3 py-1.5">
              Quitter
            </button>
          </div>
          {voice.error && <p className="text-xs text-[var(--danger)] mb-2">{voice.error}</p>}
          <div className="flex flex-wrap gap-1.5 mb-3 max-h-24 overflow-y-auto">
            {voice.participants.map((p) => (
              <span
                key={p.identity}
                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                  p.isSpeaking ? 'bg-[var(--accent-green)] text-white' : 'bg-[var(--bg-active)] text-[var(--text-muted)]'
                }`}
              >
                {p.isMuted ? <MicOff size={11} /> : <Mic size={11} />}
                {p.name}
                {p.isScreenShare && <MonitorUp size={11} />}
                {p.isLocal && ' (vous)'}
              </span>
            ))}
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={voice.toggleMute}
              className="w-11 h-11 rounded-full bg-[var(--bg-active)] hover:bg-[var(--bg-hover)] flex items-center justify-center"
              title="Micro"
            >
              {voice.participants.find((p) => p.isLocal)?.isMuted ? (
                <MicOff size={18} />
              ) : (
                <Mic size={18} />
              )}
            </button>
            <button
              onClick={voice.toggleCamera}
              className="w-11 h-11 rounded-full bg-[var(--bg-active)] hover:bg-[var(--bg-hover)] flex items-center justify-center"
              title="Caméra"
            >
              <Video size={18} />
            </button>
            <button
              onClick={voice.toggleScreenShare}
              className="w-11 h-11 rounded-full bg-[var(--bg-active)] hover:bg-[var(--bg-hover)] flex items-center justify-center"
              title="Partage d'écran"
            >
              <MonitorUp size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
