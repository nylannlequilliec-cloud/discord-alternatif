import { useCallback } from 'react'
import { useUI } from '../context/UIContext'

// Boîte d'interface personnalisable : drag (déplacer), resize, styles
// (opacité, ombre, rayon, fond, échelle, police) persistés dans ui_layouts.
export default function UIBox({ id, className = '', children, style: extraStyle = {}, onSelect }) {
  const { editMode, selected, setSelected, updateElementStyle, layout } = useUI()
  const s = layout[id] || {}

  const custom = s.x != null || s.y != null || s.w != null || s.h != null

  const boxStyle = {
    position: custom ? 'absolute' : undefined,
    left: s.x ?? undefined,
    top: s.y ?? undefined,
    width: s.w ?? undefined,
    height: s.h ?? undefined,
    opacity: s.opacity != null ? s.opacity / 100 : undefined,
    borderRadius: s.radius != null ? s.radius : undefined,
    background: s.bg || undefined,
    fontSize: s.fontSize != null ? `${s.fontSize}px` : undefined,
    boxShadow: s.shadowEnabled ? `0 0 ${s.shadowBlur ?? 12}px 0 ${s.shadowColor || '#000'}` : undefined,
    transform: s.scale != null && s.scale !== 100 ? `scale(${s.scale / 100})` : undefined,
    transformOrigin: 'top left',
    zIndex: custom ? 15 : undefined,
  }

  const startDrag = useCallback(
    (e) => {
      if (!editMode) return
      if (e.target.closest('button, input, textarea, a, .ui-resize-handle')) return
      e.preventDefault()
      const startX = e.clientX
      const startY = e.clientY
      const el = s
      const origX = el.x ?? 0
      const origY = el.y ?? 0

      const onMove = (ev) => {
        const nx = Math.max(0, origX + (ev.clientX - startX))
        const ny = Math.max(0, origY + (ev.clientY - startY))
        updateElementStyle(id, { x: Math.round(nx), y: Math.round(ny) })
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      // s change à chaque rendu : on lit les valeurs de départ au début du drag
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editMode, id, updateElementStyle])

  const startResize = useCallback(
    (e) => {
      if (!editMode) return
      e.preventDefault()
      e.stopPropagation()
      const startX = e.clientX
      const startY = e.clientY
      const origW = s.w ?? 400
      const origH = s.h ?? 300

      const onMove = (ev) => {
        const nw = Math.max(80, origW + (ev.clientX - startX))
        const nh = Math.max(48, origH + (ev.clientY - startY))
        updateElementStyle(id, { w: Math.round(nw), h: Math.round(nh) })
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [editMode, id, s.w, s.h, updateElementStyle]
  )

  const isSelected = selected === id

  return (
    <div
      data-ui-id={id}
      className={`${className} ${isSelected ? 'ui-selected' : ''}`}
      style={{ ...boxStyle, ...extraStyle }}
      onClick={
        editMode
          ? (e) => {
              e.stopPropagation()
              setSelected(id)
              onSelect?.(id)
            }
          : undefined
      }
      onPointerDown={editMode ? startDrag : undefined}
    >
      {children}
      {editMode && isSelected && <div className="ui-resize-handle" onPointerDown={startResize} />}
    </div>
  )
}
