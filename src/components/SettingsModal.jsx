import { useState, useRef } from 'react'
import { Camera } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useUI } from '../context/UIContext'
import { usePush } from '../hooks/usePush'
import { STATUS_LABELS, STATUS_COLORS } from './NotificationsBell'

const ACCENT_PRESETS = [
  { name: 'Discord', color: '#5865f2' },
  { name: 'Vert', color: '#23a55a' },
  { name: 'Rouge', color: '#ed4245' },
  { name: 'Rose', color: '#eb459e' },
  { name: 'Orange', color: '#f26522' },
  { name: 'Turquoise', color: '#1abc9c' },
  { name: 'Jaune', color: '#f0b232' },
  { name: 'Violet', color: '#9b59b6' },
]

export default function SettingsModal({ open, onClose }) {
  const { session, profile, refreshProfile } = useAuth()
  const { theme, setTheme, accent, setAccent } = useUI()
  const push = usePush()
  const [username, setUsername] = useState('')
  const [status, setStatus] = useState('online')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [tab, setTab] = useState('profil') // profil | apparence | notifications
  const fileRef = useRef(null)

  if (!open) return null

  const uploadAvatar = async (file) => {
    if (!session?.user || !file) return
    setUploading(true)
    const path = `${session.user.id}/avatar-${Date.now()}.${file.name.split('.').pop() || 'png'}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`
      setAvatarUrl(url)
    }
    setUploading(false)
  }

  const saveProfile = async () => {
    setSaving(true)
    setSavedMsg('')
    const updates = {}
    if (username.trim() && username.trim() !== profile?.username) updates.username = username.trim()
    if (status !== profile?.status) updates.status = status
    if (avatarUrl && avatarUrl !== profile?.avatar_url) updates.avatar_url = avatarUrl

    if (Object.keys(updates).length) {
      const { error } = await supabase.from('profiles').update(updates).eq('id', session.user.id)
      if (error) {
        setSavedMsg('Erreur : ' + (error.message || 'impossible d\'enregistrer'))
      } else {
        setSavedMsg('Profil enregistré ✅')
        refreshProfile()
      }
    }
    setSaving(false)
    setTimeout(() => setSavedMsg(''), 3000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" onClick={onClose}>
      <div
        className="bg-[var(--bg-modal)] rounded-lg w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex border-b border-[var(--border)]">
          {[
            ['profil', 'Profil'],
            ['apparence', 'Apparence'],
            ['notifications', 'Notifications'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
                tab === id
                  ? 'text-[var(--text-primary)] border-[var(--accent)]'
                  : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {tab === 'profil' && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="relative w-20 h-20 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xl font-bold overflow-hidden hover:opacity-80"
                  title="Changer la photo de profil"
                >
                  {avatarUrl || profile?.avatar_url ? (
                    <img src={avatarUrl || profile?.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    profile?.username?.slice(0, 2).toUpperCase()
                  )}
                  <span className="absolute bottom-0 inset-x-0 bg-black/50 text-[10px] py-1 flex items-center justify-center">
                    <Camera size={12} />
                  </span>
                </button>
                <div className="text-sm text-[var(--text-muted)]">
                  {uploading ? 'Envoi…' : 'Clique sur la photo pour la changer'}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      uploadAvatar(e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Pseudo</label>
                <input
                  value={username || profile?.username || ''}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  placeholder="Ton pseudo"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Statut</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setStatus(key)}
                      className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition ${
                        (status || profile?.status) === key
                          ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[key] }} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium rounded py-2.5 text-sm transition disabled:opacity-50"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer le profil'}
              </button>
              {savedMsg && <p className="text-sm text-[var(--text-muted)] text-center">{savedMsg}</p>}
            </div>
          )}

          {tab === 'apparence' && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Thème</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['dark', '🌙 Sombre'],
                    ['light', '☀️ Clair'],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setTheme(key)}
                      className={`px-3 py-2.5 rounded text-sm transition ${
                        theme === key
                          ? 'bg-[var(--bg-active)] text-[var(--text-primary)] ring-2 ring-[var(--accent)]'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">
                  Couleur d'accent
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {ACCENT_PRESETS.map((p) => (
                    <button
                      key={p.color}
                      onClick={() => setAccent(p.color)}
                      title={p.name}
                      className={`w-9 h-9 rounded-full transition ${accent === p.color ? 'ring-2 ring-[var(--text-primary)] scale-110' : 'hover:scale-110'}`}
                      style={{ background: p.color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    title="Couleur personnalisée"
                    className="w-9 h-9 rounded-full cursor-pointer"
                  />
                </div>
                <p className="text-xs text-[var(--text-muted)]">La couleur d'accent s'applique partout (boutons, liens, surlignages…)</p>
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="space-y-4">
              {!push.supported ? (
                <p className="text-sm text-[var(--text-muted)]">Les notifications push ne sont pas supportées par ce navigateur.</p>
              ) : !push.configured ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Les notifications push ne sont pas encore configurées sur le serveur (clé VAPID manquante). Les notifications
                  dans l'app (cloche de notifications) fonctionnent quand même.
                </p>
              ) : push.subscribed ? (
                <div>
                  <p className="text-sm text-[var(--text-secondary)] mb-3">
                    ✅ Notifications push activées pour <strong>{profile?.username}</strong>
                  </p>
                  <button
                    onClick={push.unsubscribe}
                    disabled={push.busy}
                    className="bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded px-4 py-2 text-sm disabled:opacity-50"
                  >
                    Désactiver les notifications
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-[var(--text-secondary)] mb-3">
                    Reçois une notification navigateur quand quelqu'un te mentionne ou t'écrit en privé.
                  </p>
                  <button
                    onClick={push.subscribe}
                    disabled={push.busy}
                    className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded px-4 py-2 text-sm disabled:opacity-50"
                  >
                    Activer les notifications
                  </button>
                  {push.error && <p className="text-sm text-[var(--danger)] mt-2">{push.error}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end">
          <button onClick={onClose} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
