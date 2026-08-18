// Registre des éléments personnalisables de l'interface
// (utilisé par l'éditeur d'UI : clic → propriétés → persistance)
export const UI_ELEMENTS = {
  'server-bar': { label: 'Barre des serveurs' },
  'channel-sidebar': { label: 'Liste des salons' },
  'chat-area': { label: 'Zone de discussion' },
  'member-list': { label: 'Liste des membres' },
  'chat-header': { label: 'En-tête du salon' },
  'chat-input': { label: 'Barre de saisie' },
  'user-bar': { label: 'Barre utilisateur' },
}

export const EMPTY_ELEMENT_STYLE = {
  x: null, y: null, w: null, h: null, // null = flux normal, sinon position absolue
  opacity: 100,
  shadowEnabled: false,
  shadowBlur: 12,
  shadowColor: '#000000',
  radius: null,
  bg: null,
  scale: 100,
  fontSize: null,
}

export function mergeElementStyle(saved, defaults = EMPTY_ELEMENT_STYLE) {
  return { ...defaults, ...(saved || {}) }
}
