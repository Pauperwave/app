// test\unit\utils\tablePlayerStanding.test.ts
import { describe, expect, it } from 'vitest'
import {
  commanderTablePlayerStanding, swissTablePlayerStanding
} from '~/utils/tournaments/tablePlayerStanding'
import { ICONS } from '~/utils/icons'

describe('swissTablePlayerStanding', () => {
  it('shows points, the V-P-S record and the tiebreakers in ranking order', () => {
    const standing = swissTablePlayerStanding({
      playerUuid: 'p1',
      matchPoints: 7,
      wins: 2,
      draws: 1,
      losses: 0,
      omw: 2 / 3,
      gw: 0.8,
      ogw: 0.5555
    }, 3)

    expect(standing).toEqual({
      rank: 3,
      points: 7,
      record: '2-1-0',
      tiebreakers: [
        { label: 'OMW%', value: '66.7' },
        { label: 'GW%', value: '80.0' },
        { label: 'OGW%', value: '55.5' }
      ]
    })
  })
})

describe('commanderTablePlayerStanding', () => {
  it('shows the score and the tiebreakers in ranking order as icons, with no record', () => {
    const standing = commanderTablePlayerStanding(
      { score: 12, victories: 2, kills: 3, brewReceived: 1, playReceived: 0 },
      1,
      { victories: 'Vittorie', kills: 'Uccisioni', brew: 'Mazzo', play: 'Giocata' }
    )

    expect(standing).toEqual({
      rank: 1,
      points: 12,
      tiebreakers: [
        { label: 'Vittorie', value: '2', icon: ICONS.standings },
        { label: 'Uccisioni', value: '3', icon: ICONS.kills },
        { label: 'Mazzo', value: '1', icon: ICONS.brewVotes },
        { label: 'Giocata', value: '0', icon: ICONS.playVotes }
      ]
    })
  })
})
