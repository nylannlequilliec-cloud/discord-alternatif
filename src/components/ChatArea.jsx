import { useState, useRef, useEffect } from 'react'
import { useMessages } from '../hooks/useMessages'

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatArea({ channel, currentUserId }) {
  const { messages, loading, sendMessage } = useMessages(channel?.id)
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim()) return
    const content = input
    setInput('')
    await sendMessage(content)
  }

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#949ba4]">
        Sélectionne un salon pour commencer à discuter
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#313338] min-w-0">
      <div className="h-12 px-4 flex items-center border-b border-[#26272b] shadow-sm shrink-0">
        <span className="text-[#80848e] text-xl mr-1.5">#</span>
        <span className="text-white font-semibold">{channel.name}</span>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col-reverse">
        <div ref={bottomRef} />
        <div className="flex flex-col">
          {!loading && messages.length === 0 && (
            <div className="px-4 py-8 text-center text-[#949ba4] text-sm">
              Aucun message pour l'instant. Sois le premier à écrire !
            </div>
          )}
          {messages.map((msg, i) => {
            const prev = messages[i - 1]
            const grouped = prev && prev.author_id === msg.author_id &&
              (new Date(msg.created_at) - new Date(prev.created_at)) < 5 * 60 * 1000

            const isMentioned = msg.mentions?.includes(currentUserId)

            return (
              <div
                key={msg.id}
                className={`px-4 hover:bg-[#2e3035] flex gap-3 ${grouped ? 'py-0.5' : 'py-2 mt-2'} ${isMentioned ? 'bg-[#3c3814] hover:bg-[#454020] border-l-2 border-[#f0b232]' : ''}`}
              >
                {!grouped ? (
                  <div className="w-10 h-10 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {msg.author?.username?.slice(0, 2).toUpperCase() || '??'}
                  </div>
                ) : (
                  <div className="w-10 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  {!grouped && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-white font-medium text-[15px]">{msg.author?.username || 'Utilisateur'}</span>
                      <span className="text-xs text-[#949ba4]">{formatTime(msg.created_at)}</span>
                    </div>
                  )}
                  <p className="text-[#dbdee1] text-[15px] break-words whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <form onSubmit={handleSend} className="px-4 pb-6 pt-2 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Écrire dans #${channel.name}`}
          className="w-full bg-[#383a40] text-white rounded-lg px-4 py-2.5 text-sm outline-none placeholder-[#6d6f78]"
        />
      </form>
    </div>
  )
}
