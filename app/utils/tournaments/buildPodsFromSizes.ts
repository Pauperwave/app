// app\utils\tournaments\buildPodsFromSizes.ts
// Shared by useCommanderPods.ts and useDraftPods.ts: their calculatePods() rules differ per format,
// but slicing an ordered (e.g. seeded) list of player ids into the pod sizes it decided on was
// identical
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
