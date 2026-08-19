import { Fragment } from 'react'

// Rendu markdown sûr (aucun HTML injecté — uniquement des éléments React) :
// **gras**, *italique*, ~~barré~~, `code`, ```bloc```, liens auto-détectés.
// Conserve aussi le surlignage des @mentions.

const URL_RE = /(https?:\/\/[^\s<]+)/g

function renderInline(text, keyBase) {
  const nodes = []
  // inline code `...`
  const codeParts = text.split(/`([^`]+)`/g)
  for (let c = 0; c < codeParts.length; c++) {
    const part = codeParts[c]
    if (c % 2 === 1) {
      nodes.push(
        <code key={`${keyBase}-c${c}`} className="bg-[var(--bg-input)] text-[var(--text-secondary)] rounded px-1.5 py-0.5 text-[13px] font-mono">
          {part}
        </code>
      )
      continue
    }
    // liens
    const urlParts = part.split(URL_RE)
    for (let u = 0; u < urlParts.length; u++) {
      const seg = urlParts[u]
      if (!seg) continue
      if (seg.startsWith('http')) {
        nodes.push(
          <a key={`${keyBase}-u${u}`} href={seg} target="_blank" rel="noreferrer" className="text-[var(--text-link)] hover:underline break-all">
            {seg}
          </a>
        )
        continue
      }
      // **gras** puis *italique* puis ~~barré~~ (séquentiel, sans récursion infinie)
      const styleParts = seg.split(/(\*\*[^*]+\*\*|~~[^~]+~~|\*[^*]+\*)/g)
      for (let s = 0; s < styleParts.length; s++) {
        const sp = styleParts[s]
        if (!sp) continue
        if (sp.startsWith('**') && sp.endsWith('**') && sp.length > 4) {
          nodes.push(<strong key={`${keyBase}-b${s}`}>{sp.slice(2, -2)}</strong>)
        } else if (sp.startsWith('~~') && sp.endsWith('~~') && sp.length > 4) {
          nodes.push(
            <s key={`${keyBase}-s${s}`} className="opacity-70">
              {sp.slice(2, -2)}
            </s>
          )
        } else if (sp.startsWith('*') && sp.endsWith('*') && sp.length > 2) {
          nodes.push(<em key={`${keyBase}-i${s}`}>{sp.slice(1, -1)}</em>)
        } else {
          nodes.push(<Fragment key={`${keyBase}-t${s}`}>{sp}</Fragment>)
        }
      }
    }
  }
  return nodes
}

export function renderMarkdown(text) {
  if (!text) return null
  const nodes = []
  // blocs de code ```...```
  const blockParts = text.split(/```[\w-]*\n?([\s\S]*?)```/g)
  for (let b = 0; b < blockParts.length; b++) {
    const part = blockParts[b]
    if (b % 2 === 1) {
      nodes.push(
        <pre key={`pre${b}`} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-3 my-1.5 text-[13px] font-mono overflow-x-auto whitespace-pre-wrap">
          {part}
        </pre>
      )
      continue
    }
    const lines = part.split('\n')
    lines.forEach((line, li) => {
      nodes.push(
        <Fragment key={`l${b}-${li}`}>
          {renderInline(line, `l${b}-${li}`)}
          {li < lines.length - 1 ? '\n' : null}
        </Fragment>
      )
    })
  }
  return nodes
}
