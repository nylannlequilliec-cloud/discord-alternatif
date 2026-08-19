import { useState } from 'react'
import { MessageSquareText, X } from 'lucide-react'
import MessageItem from './MessageItem'

// Panneau latéral d'un fil de discussion
export default function ThreadPanel({ channel, threads, currentUserId, canModerate, onDmUser }) {
  const [input, setInput] = useState('')
  const parent = threads.threads.find((t) => t.id === threads.activeThread)

  const send = async (e) => {
    e.preventDefault()
    if (!input.trim()) return
    const content = input
    setInput('')
    await threads.reply(content)
  }

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[340px] bg-[var(--bg-secondary)] border-l border-[var(--border)] flex flex-col z-30">
      <div className="h-12 px-4 flex items-center justify-between border-b border-[var(--border)] shrink-0">
        <span className="text-[var(--text-primary)] font-semibold text-sm flex items-center gap-2">
          <MessageSquareText size={16} /> Fil — #{channel.name}
        </span>
        <button
          onClick={threads.closeThread}
          className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          title="Fermer le fil"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {parent && (
          <div className="mb-2 border-b border-[var(--border)] pb-2">
            <MessageItem
              msg={parent}
              prev={null}
              currentUserId={currentUserId}
              canModerate={canModerate}
              reactions={null}
              onOpenThread={() => {}}
              onDmUser={onDmUser}
              onEdited={() => threads.loadReplies(threads.activeThread)}
              onDeleted={() => threads.loadReplies(threads.activeThread)}
            />
          </div>
        )}
        {threads.replies.length === 0 && (
          <p className="text-center text-xs text-[var(--text-muted)] px-4 py-6">
            Aucune réponse pour l'instant. Lance la discussion !
          </p>
        )}
        {threads.replies.map((msg, i) => (
          <MessageItem
            key={msg.id}
            msg={msg}
            prev={threads.replies[i - 1]}
            currentUserId={currentUserId}
            canModerate={canModerate}
            reactions={null}
            onOpenThread={() => {}}
            onDmUser={onDmUser}
            onEdited={() => threads.loadReplies(threads.activeThread)}
            onDeleted={() => threads.loadReplies(threads.activeThread)}
          />
        ))}
      </div>

      <form onSubmit={send} className="p-3 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Répondre dans le fil…"
          className="w-full bg-[var(--bg-input)] text-[var(--text-secondary)] rounded-lg px-3 py-2.5 text-sm outline-none placeholder-[var(--text-muted)]"
        />
      </form>
    </div>
  )
}
