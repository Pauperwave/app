// app\utils\cardColors.ts

/** Canonical WUBRG order — mono-color sorting/grouping across the app reads
 * this, not a local copy. Copied verbatim from MagicTheGathering/league. */
export const WUBRG_ORDER = ['W', 'U', 'B', 'R', 'G']

/**
 * Conventional MTG collection grouping: each mono color in WUBRG order,
 * then multicolor as one bucket, then colorless last. Lower rank sorts first.
 */
export function colorGroupRank(colorIdentity: string[]): number {
  if (colorIdentity.length === 0) return WUBRG_ORDER.length + 1
  if (colorIdentity.length === 1) {
    const index = WUBRG_ORDER.indexOf(colorIdentity[0]!)
    return index === -1 ? WUBRG_ORDER.length : index
  }
  return WUBRG_ORDER.length
}

// Stessi colori usati da MagicTheGathering/league's resolveCardColors +
// buildGradientClass (app/utils/cardColors.ts lì), ma qui come valori CSS
// diretti invece di classi Tailwind `from-${color}` costruite a runtime:
// Tailwind non genera classi che non compaiono letteralmente nel sorgente,
// quindi quelle stringhe dinamiche non verrebbero scansionate/incluse nel
// CSS finale. Uno style inline con un gradiente CSS evita il problema.
const COLOR_HEX: Record<string, string> = {
  W: '#fef3c7', // amber-100
  U: '#2563eb', // blue-600
  B: '#030712', // gray-950
  R: '#dc2626', // red-600
  G: '#16a34a', // green-600
  C: '#d1d5db' // gray-300
}

/** Estrae le lettere WUBRG da un costo di mana come "{2}{W}{U}". */
export function extractColorsFromManaCost(costString: string): Set<string> {
  const colors = new Set<string>()
  const matches = costString.match(/\{([^}]*)\}/g) || []

  matches.forEach((mana) => {
    const content = mana.replace(/[{}]/g, '')
    for (const c of content) {
      if ('WUBRGC'.includes(c) && c !== 'P') colors.add(c)
    }
  })

  return colors
}

interface CardColorInput {
  manaCost?: string | null
  isDoubleFaced?: boolean
  backManaCost?: string | null
  colorIdentity?: string[]
}

/** Risolve i colori da mostrare per una carta: dal costo di mana (fronte +
 * retro se a due facce), poi color identity, poi incolore come fallback. */
export function resolveCardColors(card: CardColorInput): string[] {
  const colors = new Set<string>()

  if (card.manaCost) extractColorsFromManaCost(card.manaCost).forEach(c => colors.add(c))
  if (card.isDoubleFaced && card.backManaCost) {
    extractColorsFromManaCost(card.backManaCost).forEach(c => colors.add(c))
  }
  if (colors.size === 0 && card.colorIdentity?.length) {
    card.colorIdentity.forEach(c => colors.add(c))
  }
  if (colors.size === 0) return ['C']

  return Array.from(colors)
}

/** Costruisce un gradiente CSS (per :style, non una classe Tailwind) dai
 * colori risolti di una carta — stessa logica a gradini di buildGradientClass
 * in league, tradotta in linear-gradient inline. */
export function buildGradientStyle(colors: string[]): string {
  const hex = (c: string) => COLOR_HEX[c] ?? COLOR_HEX.C!

  if (colors.length > 3) {
    return `linear-gradient(to bottom right, ${COLOR_HEX.W}, ${COLOR_HEX.W}, transparent)`
  }
  if (colors.length === 3) {
    const [from, via, to] = colors.map(hex)
    return `linear-gradient(to right, ${from}, ${via}, ${to})`
  }
  if (colors.length === 2) {
    const [from, to] = colors.map(hex)
    return `linear-gradient(to bottom right, ${from}, ${to})`
  }

  const color = hex(colors[0]!)
  return `linear-gradient(to bottom right, ${color}, ${color}, transparent)`
}
