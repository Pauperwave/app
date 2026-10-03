// shared\utils\commanders\voteMedals.ts

export interface VoteDeckRow {
  deckUuid: string
  commander1Name: string
  commander2Name: string | null
  voteType: string
  votes: number
}

// A deck that earned a mention, with how many times: a medal on the player's page
export interface VoteMedal {
  deckUuid: string
  commander1Name: string
  commander2Name: string | null
  votes: number
}

export interface VoteMedals {
  brew: VoteMedal[]
  play: VoteMedal[]
}

// Splits a player's vote rows by kind, most decorated deck first (ties by name, so the order is
// stable between renders)
export function groupVoteMedals(rows: VoteDeckRow[]): VoteMedals {
  const medals: VoteMedals = { brew: [], play: [] }

  for (const row of rows) {
    if (row.voteType !== 'brew' && row.voteType !== 'play') continue

    medals[row.voteType].push({
      deckUuid: row.deckUuid,
      commander1Name: row.commander1Name,
      commander2Name: row.commander2Name,
      votes: row.votes
    })
  }

  const byVotesThenName = (a: VoteMedal, b: VoteMedal) =>
    b.votes - a.votes || a.commander1Name.localeCompare(b.commander1Name)
  medals.brew.sort(byVotesThenName)
  medals.play.sort(byVotesThenName)

  return medals
}
