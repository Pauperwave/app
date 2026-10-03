// shared\utils\commanders\commanderUsage.ts
// Which commanders a player has already played, and when: the "recently used" group of the
// website's commander search, and the history the Telegram bot offers first. Shared so both count
// and order them the same way.

/** Per-commander play history for one player: most recent day and how many rounds. */
export interface CommanderUsage {
  /** ISO `YYYY-MM-DD` (UTC) of the most recent round this commander was played in. */
  lastPlayedDay: string
  count: number
}

export interface UsageResultRow {
  playerUuid: string
  commanderDeckUuid: string | null
  createdAt: string
}

export interface UsageDeck {
  uuid: string
  commander1Name: string
  commander2Name: string | null
}

function recordUsage(usage: Map<string, CommanderUsage>, name: string | null, day: string) {
  if (!name) return
  const existing = usage.get(name)
  if (!existing) {
    usage.set(name, { lastPlayedDay: day, count: 1 })
    return
  }
  existing.count += 1
  if (day > existing.lastPlayedDay) existing.lastPlayedDay = day
}

// Every commander of a deck counts separately (a partner pair adds one play to each of the two).
export function buildCommanderUsageByPlayer(
  results: readonly UsageResultRow[],
  decks: readonly UsageDeck[]
): Map<string, Map<string, CommanderUsage>> {
  const byPlayer = new Map<string, Map<string, CommanderUsage>>()
  const decksByUuid = new Map(decks.map(deck => [deck.uuid, deck]))

  for (const row of results) {
    const deck = row.commanderDeckUuid ? decksByUuid.get(row.commanderDeckUuid) : undefined
    if (!deck) continue

    const day = row.createdAt.slice(0, 10)
    let usage = byPlayer.get(row.playerUuid)
    if (!usage) {
      usage = new Map()
      byPlayer.set(row.playerUuid, usage)
    }
    recordUsage(usage, deck.commander1Name, day)
    recordUsage(usage, deck.commander2Name, day)
  }
  return byPlayer
}

// Most recently played first, a tie on the same day broken by how often it was played.
export function sortCommandersByRecency(
  usage: ReadonlyMap<string, CommanderUsage>
): { name: string, usage: CommanderUsage }[] {
  return [...usage.entries()]
    .map(([name, commanderUsage]) => ({ name, usage: commanderUsage }))
    .sort((a, b) => {
      const dayDiff = b.usage.lastPlayedDay.localeCompare(a.usage.lastPlayedDay)
      return dayDiff !== 0 ? dayDiff : b.usage.count - a.usage.count
    })
}
