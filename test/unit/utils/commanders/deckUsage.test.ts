// test\unit\utils\commanders\deckUsage.test.ts
import { describe, expect, it } from 'vitest'
import { countTournamentsByDeck } from '#shared/utils/commanders/deckUsage'

describe('countTournamentsByDeck', () => {
  it('counts a deck once per tournament, whatever the number of rounds', () => {
    const counts = countTournamentsByDeck([
      { commander_deck_uuid: 'deck-a', tournament_uuid: 't1' },
      { commander_deck_uuid: 'deck-a', tournament_uuid: 't1' },
      { commander_deck_uuid: 'deck-a', tournament_uuid: 't2' },
      { commander_deck_uuid: 'deck-b', tournament_uuid: 't1' }
    ])

    expect(counts.get('deck-a')).toBe(2)
    expect(counts.get('deck-b')).toBe(1)
  })

  it('ignores results with no deck', () => {
    const counts = countTournamentsByDeck([{ commander_deck_uuid: null, tournament_uuid: 't1' }])

    expect(counts.size).toBe(0)
  })

  it('has no entry for a deck that was never played', () => {
    expect(countTournamentsByDeck([]).get('deck-a')).toBeUndefined()
  })
})
