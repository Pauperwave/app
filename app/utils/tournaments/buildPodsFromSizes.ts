// app\utils\tournaments\buildPodsFromSizes.ts
// Extracted out of useCommanderPods.ts and useDraftPods.ts (2026-08-29,
// fallow:dupes) — both composables' own calculatePods() differs (different
// ideal/minimum pod-size rules per format), but the "slice an ordered
// (e.g. pre-shuffled/seeded) list of player ids into pods of the sizes
// calculatePods() decided on" step was byte-identical.
export function buildPodsFromSizes(playerIds: string[], tableSizes: number[]): string[][] {
  if (!tableSizes.length) return []

  const pods: string[][] = []
  let cursor = 0
  for (const size of tableSizes) {
    pods.push(playerIds.slice(cursor, cursor + size))
    cursor += size
  }
  return pods
}
