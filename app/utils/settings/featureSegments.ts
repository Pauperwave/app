// app\utils\settings\featureSegments.ts

export interface FeatureSegment {
  kind: 'text' | 'strong' | 'code'
  value: string
}

// Two things to highlight inline in a feature description, matched together so overlapping matches
// can't fight:
// - `**word**` markers (set by hand in it.json, one per verb, e.g. "**Creare**, **modificare**
//   tornei...") render as <strong>, since which words are verbs isn't derivable from the Italian
//   text.
// - an in-app route mentioned inline (e.g. "(/associates)" in "Gestire l'anagrafica soci
//   (/associates)") renders in the font-mono style domains.vue uses for routes, but only a path,
//   not any "/" in running text:
//   the lookbehind requires the slash right after whitespace, an opening paren or the string start,
//   so "Assegnare/modificare" (a mid-word "/") stays plain text.
const INLINE_PATTERN = /\*\*(.+?)\*\*|(?<=^|[\s(])\/[a-zA-Z][\w-]*(?:\/[\w-]+)*/g

export function featureSegments(text: string): FeatureSegment[] {
  const segments: FeatureSegment[] = []
  let lastIndex = 0
  for (const match of text.matchAll(INLINE_PATTERN)) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', value: text.slice(lastIndex, match.index) })
    }
    segments.push(match[1]
      ? { kind: 'strong', value: match[1] }
      : { kind: 'code', value: match[0] })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) segments.push({ kind: 'text', value: text.slice(lastIndex) })
  return segments
}
