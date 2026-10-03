// test\unit\server\telegram\commanderPodCompletion.test.ts
import { describe, expect, it } from 'vitest'
import {
  pendingSeatNames
} from '../../../../server/utils/telegram/commands/tournaments/commanderPodCompletion'

const SEATS = [
  { playerUuid: 'a', name: 'Anna' },
  { playerUuid: 'b', name: 'Bruno' },
  { playerUuid: 'c', name: 'Carla' }
]

const votesOf = (voter: string) => [
  { voter_uuid: voter, vote_type: 'brew' },
  { voter_uuid: voter, vote_type: 'play' }
]

describe('pendingSeatNames', () => {
  it('is empty when every seat has a position and both votes', () => {
    const votes = SEATS.flatMap(seat => votesOf(seat.playerUuid))
    expect(pendingSeatNames(SEATS, new Set(['a', 'b', 'c']), votes)).toEqual([])
  })

  it('lists everyone while nobody has started', () => {
    expect(pendingSeatNames(SEATS, new Set(), [])).toEqual(['Anna', 'Bruno', 'Carla'])
  })

  it('keeps a seat pending without a position, even with both votes', () => {
    const votes = SEATS.flatMap(seat => votesOf(seat.playerUuid))
    expect(pendingSeatNames(SEATS, new Set(['a', 'c']), votes)).toEqual(['Bruno'])
  })

  it('keeps a seat pending with a single vote missing', () => {
    const votes = [
      ...votesOf('a'),
      ...votesOf('b'),
      { voter_uuid: 'c', vote_type: 'brew' }
    ]
    expect(pendingSeatNames(SEATS, new Set(['a', 'b', 'c']), votes)).toEqual(['Carla'])
  })

  it('does not count a vote cast by someone else', () => {
    const votes = [...votesOf('a'), ...votesOf('b')]
    expect(pendingSeatNames(SEATS, new Set(['a', 'b', 'c']), votes)).toEqual(['Carla'])
  })

  it('keeps the table order of the seats', () => {
    expect(pendingSeatNames([...SEATS].reverse(), new Set(), [])).toEqual(['Carla', 'Bruno', 'Anna'])
  })
})
