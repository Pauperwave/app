// test\unit\utils\players\playerMentions.test.ts
import { describe, expect, it } from 'vitest'
import { summarizeMentions, type AwardWinnerRow } from '#shared/utils/players/playerMentions'

function row(overrides: Partial<AwardWinnerRow>): AwardWinnerRow {
  return {
    award: 'brewer',
    deck_uuid: 'deck-1',
    commander_1_name: 'Atraxa',
    commander_2_name: null,
    ...overrides
  }
}

const KILL_ROW = { deck_uuid: null, commander_1_name: null, commander_2_name: null }

describe('summarizeMentions', () => {
  it('counts one mention per row, by award', () => {
    const mentions = summarizeMentions([
      row({ award: 'killer', ...KILL_ROW }),
      row({ award: 'killer', ...KILL_ROW }),
      row({ award: 'victim', ...KILL_ROW }),
      row({ award: 'brewer' }),
      row({ award: 'player' })
    ])

    expect(mentions).toMatchObject({ killer: 2, victim: 1, brewer: 1, player: 1 })
  })

  it('has nothing for a player who never came first', () => {
    expect(summarizeMentions([])).toEqual({
      killer: 0, victim: 0, brewer: 0, player: 0, brewerDecks: [], playerDecks: []
    })
  })

  it('lists the decks of the master brewer and player mentions apart', () => {
    const mentions = summarizeMentions([
      row({ award: 'brewer', deck_uuid: 'a', commander_1_name: 'Atraxa' }),
      row({ award: 'player', deck_uuid: 'b', commander_1_name: 'Krenko' })
    ])

    expect(mentions.brewerDecks.map(deck => deck.deckUuid)).toEqual(['a'])
    expect(mentions.playerDecks.map(deck => deck.deckUuid)).toEqual(['b'])
  })

  it('counts how many times the same deck earned a mention', () => {
    const mentions = summarizeMentions([
      row({ deck_uuid: 'a' }),
      row({ deck_uuid: 'a' }),
      row({ deck_uuid: 'a' })
    ])

    expect(mentions.brewer).toBe(3)
    expect(mentions.brewerDecks).toEqual([
      { deckUuid: 'a', commander1Name: 'Atraxa', commander2Name: null, mentions: 3 }
    ])
  })

  it('puts the most decorated deck first, ties in alphabetical order', () => {
    const mentions = summarizeMentions([
      row({ deck_uuid: 'a', commander_1_name: 'Zur' }),
      row({ deck_uuid: 'a', commander_1_name: 'Zur' }),
      row({ deck_uuid: 'b', commander_1_name: 'Atraxa' }),
      row({ deck_uuid: 'b', commander_1_name: 'Atraxa' }),
      row({ deck_uuid: 'c', commander_1_name: 'Muldrotha' }),
      row({ deck_uuid: 'c', commander_1_name: 'Muldrotha' }),
      row({ deck_uuid: 'c', commander_1_name: 'Muldrotha' })
    ])

    expect(mentions.brewerDecks.map(deck => deck.deckUuid)).toEqual(['c', 'b', 'a'])
  })

  it('keeps the partner of a deck', () => {
    const [deck] = summarizeMentions([row({ commander_2_name: 'Tymna' })]).brewerDecks

    expect(deck?.commander2Name).toBe('Tymna')
  })

  it('still counts a mention whose deck is unknown, without listing a deck', () => {
    const mentions = summarizeMentions([row({ deck_uuid: null, commander_1_name: null })])

    expect(mentions.brewer).toBe(1)
    expect(mentions.brewerDecks).toEqual([])
  })

  it('ignores an award it does not know', () => {
    const mentions = summarizeMentions([row({ award: 'other' }), row({ award: null })])

    expect(mentions).toEqual({
      killer: 0, victim: 0, brewer: 0, player: 0, brewerDecks: [], playerDecks: []
    })
  })
})
