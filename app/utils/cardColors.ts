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

// Same colors used by MagicTheGathering/league's resolveCardColors +
// buildGradientClass (app/utils/cardColors.ts there), but as direct CSS values
// instead of `from-${color}` Tailwind classes built at runtime: Tailwind does not
// generate classes that never appear literally in the source, so those dynamic
// strings would not be scanned into the final CSS. An inline style with a CSS
// gradient sidesteps the problem.
const COLOR_HEX: Record<string, string> = {
  W: '#fef3c7', // amber-100
  U: '#2563eb', // blue-600
  B: '#030712', // gray-950
  R: '#dc2626', // red-600
  G: '#16a34a', // green-600
  C: '#d1d5db' // gray-300
}

/** Extracts the WUBRG letters from a mana cost such as "{2}{W}{U}". */
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

/** Resolves the colors to show for a card: from the mana cost (front + back when
 * double-faced), then color identity, then colorless as a fallback. */
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

/** Builds a CSS gradient (for :style, not a Tailwind class) from a card's resolved
 * colors — same stepped logic as buildGradientClass in league, translated into an
 * inline linear-gradient. */
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
