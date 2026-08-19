import { useState, useRef, useEffect } from 'react'
import { Search, Paperclip, Send, X } from 'lucide-react'
import { useMessages } from '../hooks/useMessages'
import { useThreads } from '../hooks/useThreads'
import MessageItem from './MessageItem'
import ThreadPanel from './ThreadPanel'
import { supabase } from '../lib/supabase'
function SearchBar({ query, setQuery, results, onClose }) {
  return (
    <div className="flex items-center gap-2 ml-auto min-w-0 max-w-md">
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher dans le salon…"
          className="bg-[var(--bg-input)] text-[var(--text-secondary)] text-sm rounded pl-7 pr-3 py-1.5 w-48 focus:w-64 transition-all outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </div>
      {query && (
        <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{results} résultat(s)</span>
      )}
      {query && (
        <button onClick={onClose} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]" title="Fermer la recherche">
          <X size={14} />
        </button>
      )}
    </div>
  )
}

export default function ChatArea({ channel, currentUserId, canModerate, onDmUser, threads: threadsProp }) {
  const { messages, reactions, loading, sendMessage, toggleReaction } = useMessages(channel?.id)
  const internalThreads = useThreads(channel?.id, { disabled: !!threadsProp })
  const threads = threadsProp || internalThreads
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [uploading, setUploading] = useState(false)
  const [pendingFiles, setPendingFiles] = useState([]) // aperçus avant envoi
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    setInput('')
    setQuery('')
    setPendingFiles([])
    threads.closeThread()
  }, [channel?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!query) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [query])

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => {
    scrollToBottom()
  }, [messages.length, channel?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Recherche côté client (les messages chargés)
  const q = query.trim().toLowerCase()
  const searchResults = q
    ? messages.filter((m) => m.content?.toLowerCase().includes(q))
    : null

  const displayed = searchResults || messages

  const handleFiles = (files) => {
    const list = Array.from(files).map((f) => ({ file: f, name: f.name, type: f.type, size: f.size, url: URL.createObjectURL(f) }))
    setPendingFiles((prev) => [...prev, ...list].slice(0, 5))
  }

  const removePending = (index) => setPendingFiles((prev) => prev.filter((_, i) => i !== index))

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() && pendingFiles.length === 0) return

    let attachments = []
    if (pendingFiles.length > 0) {
      setUploading(true)
      for (const p of pendingFiles) {
        const path = `${channel.server_id}/${channel.id}/${Date.now()}-${p.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const { error } = await supabase.storage.from('files').upload(path, p.file)
        if (!error) {
          const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/files/${path}`
          attachments.push({ url, name: p.name, type: p.type, size: p.size })
        }
      }
      setUploading(false)
      setPendingFiles([])
    }

    const content = input
    setInput('')
    await sendMessage(content, attachments)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-muted)]" data-ui-id="chat-area">
        Sélectionne un salon pour commencer à discuter
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-tertiary)] min-w-0 relative" data-ui-id="chat-area">
      <div className="h-12 px-4 flex items-center border-b border-[var(--border)] shadow-sm shrink-0" data-ui-id="chat-header">
        <span className="text-[var(--text-faint)] text-xl mr-1.5">#</span>
        <span className="text-[var(--text-primary)] font-semibold truncate">{channel.name}</span>
        <SearchBar query={query} setQuery={setQuery} results={searchResults?.length ?? 0} onClose={() => setQuery('')} />
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col-reverse">
        <div ref={bottomRef} />
        <div className="flex flex-col">
          {!loading && displayed.length === 0 && (
            <div className="px-4 py-8 text-center text-[var(--text-muted)] text-sm">
              {q ? 'Aucun résultat pour cette recherche' : "Aucun message pour l'instant. Sois le premier à écrire !"}
            </div>
          )}
          {displayed.map((msg, i) => (
            <MessageItem
              key={msg.id}
              msg={msg}
              prev={displayed[i - 1]}
              currentUserId={currentUserId}
              canModerate={canModerate}
              reactions={reactions[msg.id]}
              toggleReaction={toggleReaction}
              onOpenThread={(m) => threads.openThread(m.id)}
              onDmUser={onDmUser}
              onEdited={() => {}}
              onDeleted={() => {}}
            />
          ))}
        </div>
      </div>

      {/* Aperçus de fichiers avant envoi */}
      {pendingFiles.length > 0 && (
        <div className="px-4 pt-2 flex gap-2 flex-wrap shrink-0">
          {pendingFiles.map((p, i) => (
            <div key={i} className="relative bg-[var(--bg-secondary)] rounded-lg p-1.5 pr-7 max-w-[180px]">
              {p.type?.startsWith('image/') ? (
                <img src={p.url} alt={p.name} className="h-20 rounded object-cover" />
              ) : (
                <div className="h-20 flex items-center justify-center">
                  <Paperclip size={28} className="text-[var(--text-muted)]" />
                </div>
              )}
              <span className="block text-xs text-[var(--text-muted)] truncate mt-1">{p.name}</span>
              <button
                onClick={() => removePending(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-[var(--bg-primary)] text-[var(--text-muted)] rounded-full text-xs flex items-center justify-center hover:text-[var(--danger)]"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSend} className="px-4 pb-6 pt-2 shrink-0" data-ui-id="chat-input">
        <div className="flex items-end gap-2 bg-[var(--bg-input)] rounded-lg px-3 py-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] pb-1"
            title="Joindre un fichier ou une image"
          >
            <Paperclip size={18} />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={Math.min(4, Math.max(1, input.split('\n').length))}
            placeholder={`Écrire dans #${channel.name}`}
            className="flex-1 bg-transparent text-[var(--text-secondary)] resize-none outline-none py-2 text-[15px] placeholder-[var(--text-muted)] max-h-32"
          />
          {uploading && <span className="text-xs text-[var(--text-muted)] pb-1">Envoi…</span>}
          {input.trim() && (
            <button
              type="submit"
              className="text-[var(--accent)] hover:text-[var(--accent-hover)] pb-1"
              title="Envoyer"
            >
              <Send size={18} />
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </form>

      {threads.activeThread && (
        <ThreadPanel
          channel={channel}
          threads={threads}
          currentUserId={currentUserId}
          canModerate={canModerate}
          onDmUser={onDmUser}
        />
      )}
    </div>
  )
}
