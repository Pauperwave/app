// shared\utils\players\playerMentions.ts
import type { Database } from '#shared/utils/types/database'

// A player's special mentions: how many times they came first in each of the four end-of-tournament
// awards, and the decks behind the master brewer and player ones. Summed from the player's rows of
// tournament_award_winners, which holds one row per tournament won; the site's player page and the
// bot's /menzioni both read it through here.

type WinnerRow = Database['public']['Views']['tournament_award_winners']['Row']

export type AwardWinnerRow = Pick<WinnerRow, 'award' | 'deck_uuid' | 'commander_1_name' | 'commander_2_name'>

// A deck that earned a mention, with how many times
export interface MentionDeck {
  deckUuid: string
  commander1Name: string
  commander2Name: string | null
  mentions: number
}

export interface PlayerMentions {
  killer: number
  victim: number
  brewer: number
  player: number
  brewerDecks: MentionDeck[]
  playerDecks: MentionDeck[]
}

function addDeckMention(decks: Map<string, MentionDeck>, row: AwardWinnerRow) {
  if (!row.deck_uuid || !row.commander_1_name) return

  const deck = decks.get(row.deck_uuid)
  if (deck) {
    deck.mentions += 1
    return
  }
  decks.set(row.deck_uuid, {
    deckUuid: row.deck_uuid,
    commander1Name: row.commander_1_name,
    commander2Name: row.commander_2_name,
    mentions: 1
  })
}

// Most decorated deck first, ties by name so the order is stable between renders
function sortedDecks(decks: Map<string, MentionDeck>): MentionDeck[] {
  return [...decks.values()].sort((a, b) =>
    b.mentions - a.mentions || a.commander1Name.localeCompare(b.commander1Name))
}

export function summarizeMentions(rows: AwardWinnerRow[]): PlayerMentions {
  const counts = { killer: 0, victim: 0, brewer: 0, player: 0 }
  const brewerDecks = new Map<string, MentionDeck>()
  const playerDecks = new Map<string, MentionDeck>()

  for (const row of rows) {
    if (row.award === 'killer') counts.killer += 1
    else if (row.award === 'victim') counts.victim += 1
    else if (row.award === 'brewer') {
      counts.brewer += 1
      addDeckMention(brewerDecks, row)
    } else if (row.award === 'player') {
      counts.player += 1
      addDeckMention(playerDecks, row)
    }
  }

  return { ...counts, brewerDecks: sortedDecks(brewerDecks), playerDecks: sortedDecks(playerDecks) }
}
