import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { UI_ELEMENTS, mergeElementStyle } from '../lib/ui-elements'

const UIContext = createContext(null)

const THEME_KEY = 'da_theme'
const ACCENT_KEY = 'da_accent'

export function UIProvider({ children }) {
  const { session } = useAuth()
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark')
  const [accent, setAccent] = useState(() => localStorage.getItem(ACCENT_KEY) || '#5865f2')
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState(null) // id de l'élément sélectionné
  const [layout, setLayout] = useState({}) // { [elementId]: style }
  const saveTimer = useRef(null)

  // ---- Application du thème ----
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent)
    document.documentElement.style.setProperty('--accent-hover', shadeColor(accent, -12))
    localStorage.setItem(ACCENT_KEY, accent)
  }, [accent])

  // ---- Chargement du layout sauvegardé ----
  useEffect(() => {
    if (!session?.user) return
    supabase
      .from('ui_layouts')
      .select('layout')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.layout) setLayout(data.layout)
      })
      .catch(() => {})
  }, [session])

  // ---- Sauvegarde différée du layout ----
  const persistLayout = useCallback(
    (next) => {
      if (!session?.user) return
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        supabase
          .from('ui_layouts')
          .upsert({ user_id: session.user.id, layout: next, updated_at: new Date().toISOString() })
          .then(() => {})
          .catch(() => {})
      }, 600)
    },
    [session]
  )

  const updateElementStyle = useCallback(
    (elementId, patch) => {
      setLayout((prev) => {
        const current = mergeElementStyle(prev[elementId])
        const next = { ...prev, [elementId]: { ...current, ...patch } }
        persistLayout(next)
        return next
      })
    },
    [persistLayout]
  )

  const resetElementStyle = useCallback(
    (elementId) => {
      setLayout((prev) => {
        const next = { ...prev }
        delete next[elementId]
        persistLayout(next)
        return next
      })
      if (selected === elementId) setSelected(null)
    },
    [persistLayout, selected]
  )

  const resetAllStyles = useCallback(() => {
    setLayout({})
    setSelected(null)
    persistLayout({})
  }, [persistLayout])

  const exitEditMode = useCallback(() => {
    setEditMode(false)
    setSelected(null)
  }, [])

  // Le document bascule en mode édition pour les contours
  useEffect(() => {
    document.documentElement.classList.toggle('ui-editmode', editMode)
    return () => document.documentElement.classList.remove('ui-editmode')
  }, [editMode])

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      accent,
      setAccent,
      editMode,
      setEditMode,
      exitEditMode,
      selected,
      setSelected,
      layout,
      updateElementStyle,
      resetElementStyle,
      resetAllStyles,
      UI_ELEMENTS,
      getElementStyle: (id) => mergeElementStyle(layout[id]),
    }),
    [theme, accent, editMode, selected, layout, updateElementStyle, resetElementStyle, resetAllStyles, exitEditMode]
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI doit être utilisé dans UIProvider')
  return ctx
}

// Assombrit/éclaircit une couleur hex (delta en %)
export function shadeColor(hex, percent) {
  const n = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const r = Math.min(255, Math.max(0, (n >> 16) + amt))
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amt))
  const b = Math.min(255, Math.max(0, (n & 0xff) + amt))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
