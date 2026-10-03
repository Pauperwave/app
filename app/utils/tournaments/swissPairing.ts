// app\utils\tournaments\swissPairing.ts
// Swiss pairing by standings: the best-ranked unpaired player meets the next-best one they haven't
// played. With an odd count the bye goes to the lowest-ranked player without one yet (nobody gets
// two unless everybody had one) and is placed last. With no rematch-free pairing the ranked order
// is returned as-is for the organizer to reorder.

const MAX_SEARCH_STEPS = 50_000

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/**
 * Orders `rankedPlayerUuids` (best first, active players only) so that
 * consecutive players form the tables; with an odd count one player sits out
 * on the bye, placed last. `playedPairs` are the pairs that already met in
 * earlier rounds, `previousByePlayerUuids` the players who already had a bye.
 */
export function pairSwissRound(
  rankedPlayerUuids: string[],
  playedPairs: [string, string][],
  previousByePlayerUuids: string[] = []
): string[] {
  if (rankedPlayerUuids.length < 2) return rankedPlayerUuids

  const hasBye = rankedPlayerUuids.length % 2 === 1
  const hadBye = new Set(previousByePlayerUuids)
  const byePlayerUuid = hasBye
    ? rankedPlayerUuids.findLast(uuid => !hadBye.has(uuid)) ?? rankedPlayerUuids.at(-1)
    : undefined
  const playersToPair = rankedPlayerUuids.filter(uuid => uuid !== byePlayerUuid)

  const played = new Set(playedPairs.map(([a, b]) => pairKey(a, b)))
  let steps = 0

  function search(remaining: string[]): string[] | null {
    const [first, ...others] = remaining
    if (first === undefined) return []
    if (++steps > MAX_SEARCH_STEPS) return null

    for (const opponent of others) {
      if (played.has(pairKey(first, opponent))) continue

      const rest = search(others.filter(uuid => uuid !== opponent))
      if (rest) return [first, opponent, ...rest]
    }

    return null
  }

  const paired = search(playersToPair) ?? playersToPair
  return byePlayerUuid === undefined ? paired : [...paired, byePlayerUuid]
}
