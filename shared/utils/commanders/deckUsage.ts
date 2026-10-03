// shared\utils\commanders\deckUsage.ts

interface DeckResultRow {
  commander_deck_uuid: string | null
  tournament_uuid: string
}

// How many different tournaments each deck was played in; a deck played over several rounds of one
// tournament counts once
export function countTournamentsByDeck(rows: DeckResultRow[]): Map<string, number> {
  const tournamentsByDeck = new Map<string, Set<string>>()

  for (const row of rows) {
    if (!row.commander_deck_uuid) continue

    const tournaments = tournamentsByDeck.get(row.commander_deck_uuid) ?? new Set<string>()
    tournaments.add(row.tournament_uuid)
    tournamentsByDeck.set(row.commander_deck_uuid, tournaments)
  }

  return new Map(
    [...tournamentsByDeck].map(([deckUuid, tournaments]) => [deckUuid, tournaments.size])
  )
}
