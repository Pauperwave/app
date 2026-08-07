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
