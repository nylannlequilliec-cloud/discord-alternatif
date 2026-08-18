import { useState } from 'react'

const EMOJIS = [
  '👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥',
  '✅', '❌', '👀', '💯', '🤔', '🙏', '😎', '🤣',
  '🥳', '😍', '🤩', '🎮', '🐶', '🐱', '☕', '🍕',
  '⚡', '🌈', '✨', '🚀', '💜', '🧡', '💙', '💚',
  '💛', '🖤', '🤍', '👋', '💪', '🙌', '🫡', '😴',
  '🥶', '😱', '🤯', '👏', '😅', '😇', '🤝', '🫶',
]

export default function EmojiPicker({ onPick }) {
  const [tab, setTab] = useState('base')
  return (
    <div className="absolute bottom-full right-0 mb-2 w-64 bg-[var(--bg-modal)] border border-[var(--border)] rounded-lg shadow-xl z-50 p-2">
      <div className="flex gap-1 mb-2">
        <button
          onClick={() => setTab('base')}
          className={`text-xs px-2 py-1 rounded ${tab === 'base' ? 'bg-[var(--bg-active)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
        >
          Emojis
        </button>
      </div>
      <div className="emoji-grid">
        {EMOJIS.map((e) => (
          <button key={e} onClick={() => onPick(e)} title={e}>
            {e}
          </button>
        ))}
      </div>
    </div>
  )
}
