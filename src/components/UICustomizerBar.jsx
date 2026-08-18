import { useUI } from '../context/UIContext'

// Barre d'outils du mode édition (en haut, centrée)
export function UICustomizerBar() {
  const { editMode, selected, setSelected, resetElementStyle, resetAllStyles, exitEditMode, UI_ELEMENTS } = useUI()

  if (!editMode) return null
  const label = selected ? UI_ELEMENTS[selected]?.label || selected : 'Aucun élément sélectionné'

  return (
    <div className="ui-edit-toolbar">
      <span className="text-sm font-semibold text-[var(--text-primary)]">🎨 Mode édition</span>
      <span className="text-xs text-[var(--text-muted)]">Clique sur un élément pour le personnaliser</span>
      <span className="text-xs font-medium text-[var(--accent)] px-2 py-0.5 bg-[var(--bg-active)] rounded">
        {label}
      </span>
      {selected && (
        <button
          onClick={() => resetElementStyle(selected)}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] px-2 py-1 rounded hover:bg-[var(--bg-hover)]"
        >
          ↺ Réinitialiser l'élément
        </button>
      )}
      <button
        onClick={() => {
          if (window.confirm('Réinitialiser toute l\'interface ?')) resetAllStyles()
        }}
        className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)] px-2 py-1 rounded hover:bg-[var(--bg-hover)]"
      >
        ↺ Tout réinitialiser
      </button>
      <button
        onClick={() => {
          exitEditMode()
          setSelected(null)
        }}
        className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium rounded px-3 py-1.5"
      >
        Terminé ✓
      </button>
    </div>
  )
}

// Panneau de propriétés de l'élément sélectionné
export function PropertiesPanel() {
  const { editMode, selected, getElementStyle, updateElementStyle, resetElementStyle, UI_ELEMENTS } = useUI()

  if (!editMode || !selected) return null

  const s = getElementStyle(selected)
  const label = UI_ELEMENTS[selected]?.label || selected

  const Slider = ({ label: l, value, min, max, unit = '', onChange }) => (
    <div>
      <div className="flex justify-between text-xs text-[var(--text-muted)]">
        <span>{l}</span>
        <span className="text-[var(--text-secondary)]">
          {value}
          {unit}
        </span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </div>
  )

  return (
    <div className="fixed top-16 right-3 w-64 bg-[var(--bg-modal)] border border-[var(--border)] rounded-xl shadow-2xl z-[70] p-4 space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Propriétés</h3>
        <span className="text-xs text-[var(--accent)]">{label}</span>
      </div>

      <Slider
        label="Opacité"
        value={s.opacity}
        min={10}
        max={100}
        unit=" %"
        onChange={(v) => updateElementStyle(selected, { opacity: v })}
      />
      <Slider
        label="Échelle"
        value={s.scale}
        min={50}
        max={150}
        unit=" %"
        onChange={(v) => updateElementStyle(selected, { scale: v })}
      />
      <Slider
        label="Taille du texte"
        value={s.fontSize ?? 14}
        min={10}
        max={24}
        unit=" px"
        onChange={(v) => updateElementStyle(selected, { fontSize: v })}
      />
      <Slider
        label="Coins arrondis"
        value={s.radius ?? 0}
        min={0}
        max={24}
        unit=" px"
        onChange={(v) => updateElementStyle(selected, { radius: v })}
      />

      <div className="border-t border-[var(--border)] pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[var(--text-muted)]">Ombre portée</span>
          <button
            onClick={() => updateElementStyle(selected, { shadowEnabled: !s.shadowEnabled })}
            className={`w-9 h-5 rounded-full transition relative ${s.shadowEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--bg-active)]'}`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${s.shadowEnabled ? 'left-[18px]' : 'left-0.5'}`}
            />
          </button>
        </div>
        {s.shadowEnabled && (
          <div className="space-y-2">
            <Slider
              label="Flou"
              value={s.shadowBlur}
              min={2}
              max={40}
              unit=" px"
              onChange={(v) => updateElementStyle(selected, { shadowBlur: v })}
            />
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Couleur</span>
              <input type="color" value={s.shadowColor} onChange={(e) => updateElementStyle(selected, { shadowColor: e.target.value })} />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[var(--border)] pt-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>Couleur de fond</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={s.bg || '#000000'}
              onChange={(e) => updateElementStyle(selected, { bg: e.target.value })}
            />
            {s.bg && (
              <button onClick={() => updateElementStyle(selected, { bg: null })} className="text-xs hover:text-[var(--danger)]">
                Effacer
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)]">
          <div>
            <span>Position X</span>
            <input
              type="number"
              value={s.x ?? 0}
              onChange={(e) => updateElementStyle(selected, { x: Number(e.target.value) })}
              className="w-full bg-[var(--bg-input)] text-[var(--text-secondary)] rounded px-2 py-1 mt-1"
            />
          </div>
          <div>
            <span>Position Y</span>
            <input
              type="number"
              value={s.y ?? 0}
              onChange={(e) => updateElementStyle(selected, { y: Number(e.target.value) })}
              className="w-full bg-[var(--bg-input)] text-[var(--text-secondary)] rounded px-2 py-1 mt-1"
            />
          </div>
          <div>
            <span>Largeur</span>
            <input
              type="number"
              value={s.w ?? ''}
              placeholder="auto"
              onChange={(e) => updateElementStyle(selected, { w: e.target.value === '' ? null : Number(e.target.value) })}
              className="w-full bg-[var(--bg-input)] text-[var(--text-secondary)] rounded px-2 py-1 mt-1"
            />
          </div>
          <div>
            <span>Hauteur</span>
            <input
              type="number"
              value={s.h ?? ''}
              placeholder="auto"
              onChange={(e) => updateElementStyle(selected, { h: e.target.value === '' ? null : Number(e.target.value) })}
              className="w-full bg-[var(--bg-input)] text-[var(--text-secondary)] rounded px-2 py-1 mt-1"
            />
          </div>
        </div>

        <p className="text-[10px] text-[var(--text-muted)] leading-snug">
          Astuce : en mode édition, glisse un élément pour le déplacer, et utilise la poignée en bas à droite pour le
          redimensionner.
        </p>

        <button
          onClick={() => resetElementStyle(selected)}
          className="w-full text-xs text-[var(--danger)] hover:bg-[var(--bg-hover)] rounded py-1.5"
        >
          ↺ Réinitialiser cet élément
        </button>
      </div>
    </div>
  )
}
