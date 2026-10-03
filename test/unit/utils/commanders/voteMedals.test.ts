// test\unit\utils\commanders\voteMedals.test.ts
import { describe, expect, it } from 'vitest'
import { groupVoteMedals, type VoteDeckRow } from '#shared/utils/commanders/voteMedals'

function row(overrides: Partial<VoteDeckRow>): VoteDeckRow {
  return {
    deckUuid: 'deck-1',
    commander1Name: 'Atraxa',
    commander2Name: null,
    voteType: 'brew',
    votes: 1,
    ...overrides
  }
}

describe('groupVoteMedals', () => {
  it('splits the rows into brew and play medals', () => {
    const medals = groupVoteMedals([
      row({ deckUuid: 'a', voteType: 'brew' }),
      row({ deckUuid: 'b', voteType: 'play' })
    ])

    expect(medals.brew.map(medal => medal.deckUuid)).toEqual(['a'])
    expect(medals.play.map(medal => medal.deckUuid)).toEqual(['b'])
  })

  it('puts the most decorated deck first, ties in alphabetical order', () => {
    const medals = groupVoteMedals([
      row({ deckUuid: 'a', commander1Name: 'Zur', votes: 2 }),
      row({ deckUuid: 'b', commander1Name: 'Atraxa', votes: 2 }),
      row({ deckUuid: 'c', commander1Name: 'Muldrotha', votes: 5 })
    ])

    expect(medals.brew.map(medal => medal.deckUuid)).toEqual(['c', 'b', 'a'])
  })

  it('keeps the partner of a deck', () => {
    const [medal] = groupVoteMedals([row({ commander2Name: 'Tymna' })]).brew

    expect(medal?.commander2Name).toBe('Tymna')
  })

  it('ignores a vote kind it does not know', () => {
    const medals = groupVoteMedals([row({ voteType: 'other' })])

    expect(medals).toEqual({ brew: [], play: [] })
  })

  it('has no medals for no rows', () => {
    expect(groupVoteMedals([])).toEqual({ brew: [], play: [] })
  })
})
