// test\unit\server\telegram\commanderPodMessages.test.ts
import { describe, expect, it } from 'vitest'
import type { LivePod } from '../../../../server/utils/telegram/commands/tournaments/commanderPodData'
import {
  DROP_ASK_PREFIX, DROP_CANCEL_PREFIX, DROP_CONFIRM_PREFIX, DROP_UNDO_PREFIX,
  FINAL_CONFIRM_PREFIX, KILL_CONFIRM_PREFIX, KILL_TOGGLE_PREFIX,
  POS_CONFIRM_PREFIX, POS_PICK_PREFIX, VOTE_CONFIRM_PREFIX, VOTE_PICK_PREFIX,
  dropAlreadyDoneRichMessage, dropAskRichMessage, dropConfirmRichMessage, dropDoneRichMessage,
  finalRichMessage, isLastRound, killTargetUuid, killsRichMessage, positionRichMessage,
  resultFactsFor, scoreSummaryTableBlock, voteRichMessage, votesReceivedTableBlock
} from '../../../../server/utils/telegram/commands/tournaments/commanderPodMessages'

function makePod(overrides: Partial<LivePod> = {}): LivePod {
  return {
    pairingUuid: 'pairing-1',
    tournamentUuid: 'tournament-1',
    tournamentName: 'Commander Night',
    roundUuid: 'round-1',
    roundNumber: 1,
    roundCount: 3,
    tableNumber: 2,
    pairingStatus: 'playing',
    myPlayerUuid: 'me',
    opponents: [
      { playerUuid: 'p-a', associateUuid: 'a-a', name: 'Anna' },
      { playerUuid: 'p-b', associateUuid: 'a-b', name: 'Bruno' },
      { playerUuid: 'p-c', associateUuid: 'a-c', name: 'Carla' }
    ],
    myPosition: null,
    myCommanderDeckUuid: null,
    myCommanderName: null,
    myCommander1Name: null,
    myCommander2Name: null,
    myDropped: false,
    myKilledUuids: [],
    myVoteByType: { brew: null, play: null },
    ...overrides
  }
}

// Every button of a rich message, flattened.
function buttonsOf(message: { blocks: { type: string, buttons?: unknown[] }[] }) {
  return message.blocks.flatMap(block => (block.type === 'buttons' ? block.buttons ?? [] : []))
    .map(button => button as { text: string, style?: string, callback_data: string })
}

describe('positionRichMessage', () => {
  it('offers one position per seat at the table', () => {
    const fourSeats = buttonsOf(positionRichMessage(makePod()))
    expect(fourSeats.map(button => button.text)).toEqual(['1°', '2°', '3°', '4°'])

    const twoOpponents = makePod().opponents.slice(0, 2)
    const threeSeats = buttonsOf(positionRichMessage(makePod({ opponents: twoOpponents })))
    expect(threeSeats.map(button => button.text)).toEqual(['1°', '2°', '3°'])
  })

  it('carries the pairing and the position in each button', () => {
    const [first] = buttonsOf(positionRichMessage(makePod()))
    expect(first?.callback_data).toBe(`${POS_PICK_PREFIX}pairing-1:1`)
  })

  it('only offers to confirm once a position is picked, and marks the picked one', () => {
    const withoutPosition = buttonsOf(positionRichMessage(makePod()))
    expect(withoutPosition.some(b => b.callback_data.startsWith(POS_CONFIRM_PREFIX))).toBe(false)

    const buttons = buttonsOf(positionRichMessage(makePod({ myPosition: 2 })))
    expect(buttons.find(b => b.text === '⭐ 2°')?.style).toBe('success')
    expect(buttons.some(b => b.callback_data === `${POS_CONFIRM_PREFIX}pairing-1`)).toBe(true)
  })
})

describe('killsRichMessage', () => {
  it('lists every opponent plus yourself, two buttons to a row', () => {
    const message = killsRichMessage(makePod())
    const rows = message.blocks.filter(block => block.type === 'buttons')

    // 3 opponents + "Te stesso" = 4 targets in 2 rows, then the confirm button on its own.
    expect(rows).toHaveLength(3)
    expect(buttonsOf(message).map(b => b.text).slice(0, 4)).toEqual([
      '⬜ Anna', '⬜ Bruno', '⬜ Carla', '⬜ Te stesso (suicidio)'
    ])
  })

  it('marks who was already killed and encodes the target', () => {
    const buttons = buttonsOf(killsRichMessage(makePod({ myKilledUuids: ['p-b', 'me'] })))

    expect(buttons.find(b => b.text === '💀 Bruno')?.style).toBe('danger')
    expect(buttons.find(b => b.text.includes('Te stesso'))?.callback_data).toBe(`${KILL_TOGGLE_PREFIX}pairing-1:me`)
    expect(buttons.at(-1)?.callback_data).toBe(`${KILL_CONFIRM_PREFIX}pairing-1`)
  })

  it('resolves a target to the right player', () => {
    expect(killTargetUuid(makePod(), 1)).toBe('p-b')
    expect(killTargetUuid(makePod(), 'me')).toBe('me')
    expect(killTargetUuid(makePod(), 9)).toBe('')
  })
})

describe('voteRichMessage', () => {
  it('asks for the brew vote and for the play vote with different headings and codes', () => {
    const brew = voteRichMessage(makePod(), 'brew')
    const play = voteRichMessage(makePod(), 'play')

    expect(JSON.stringify(brew)).toContain('Voto del mazzo')
    expect(JSON.stringify(play)).toContain('Voto della giocata')
    expect(buttonsOf(brew)[0]?.callback_data).toBe(`${VOTE_PICK_PREFIX}pairing-1:b:0`)
    expect(buttonsOf(play)[0]?.callback_data).toBe(`${VOTE_PICK_PREFIX}pairing-1:p:0`)
  })

  it('only offers to confirm once a vote is given, and marks the one given', () => {
    expect(buttonsOf(voteRichMessage(makePod(), 'brew')).some(b => b.callback_data.startsWith(VOTE_CONFIRM_PREFIX)))
      .toBe(false)

    const voted = buttonsOf(voteRichMessage(makePod({ myVoteByType: { brew: 'p-c', play: null } }), 'brew'))
    expect(voted.find(b => b.text === '⭐ Carla')?.style).toBe('success')
    expect(voted.at(-1)?.callback_data).toBe(`${VOTE_CONFIRM_PREFIX}pairing-1:b`)
  })
})

describe('resultFactsFor and finalRichMessage', () => {
  it('summarises position, kills and votes, with dashes for what is missing', () => {
    expect(resultFactsFor(makePod())).toEqual([
      ['🏅 Posizionamento', '-'],
      ['💀 Uccisioni', 'Nessuna'],
      ['🃏 Voto mazzo', '-'],
      ['🎬 Voto giocata', '-']
    ])
  })

  it('names the people killed and voted, "Te stesso" for yourself', () => {
    const facts = resultFactsFor(makePod({
      myPosition: 1,
      myKilledUuids: ['p-a', 'me'],
      myVoteByType: { brew: 'p-b', play: 'p-c' }
    }))

    expect(facts).toEqual([
      ['🏅 Posizionamento', '1°'],
      ['💀 Uccisioni', 'Anna, Te stesso'],
      ['🃏 Voto mazzo', 'Bruno'],
      ['🎬 Voto giocata', 'Carla']
    ])
  })

  it('lets the player confirm or go back', () => {
    const buttons = buttonsOf(finalRichMessage(makePod()))
    expect(buttons.map(b => b.callback_data.split(':')[0])).toEqual([
      FINAL_CONFIRM_PREFIX.replace(':', ''), 'cmdfedit'
    ])
  })
})

describe('isLastRound', () => {
  it('is false while rounds remain, and when the round count is unknown', () => {
    expect(isLastRound(makePod({ roundNumber: 2, roundCount: 3 }))).toBe(false)
    expect(isLastRound(makePod({ roundNumber: 5, roundCount: null }))).toBe(false)
  })

  it('is true on the last round', () => {
    expect(isLastRound(makePod({ roundNumber: 3, roundCount: 3 }))).toBe(true)
  })
})

describe('drop messages', () => {
  it('each button carries its own prefix and the pairing', () => {
    const pod = makePod()

    expect(buttonsOf(dropAskRichMessage(pod)).map(b => b.callback_data))
      .toEqual([`${DROP_ASK_PREFIX}pairing-1`])
    expect(buttonsOf(dropConfirmRichMessage(pod)).map(b => b.callback_data))
      .toEqual([`${DROP_CONFIRM_PREFIX}pairing-1`, `${DROP_CANCEL_PREFIX}pairing-1`])
    expect(buttonsOf(dropDoneRichMessage(pod)).map(b => b.callback_data))
      .toEqual([`${DROP_UNDO_PREFIX}pairing-1`])
    expect(buttonsOf(dropAlreadyDoneRichMessage(pod)).map(b => b.callback_data))
      .toEqual([`${DROP_UNDO_PREFIX}pairing-1`])
  })
})

describe('follow-up tables', () => {
  const score = {
    playerUuid: 'me', position: 1, scoreRank: 8, numberOfKills: 1, killScore: 1,
    brewVotesReceived: 1, brewScore: 2, playVotesReceived: 1, playScore: 1, totalScore: 12
  }

  it('lists who voted for the player and the points of the votes received', () => {
    const table = votesReceivedTableBlock([
      { voterName: 'Anna', brew: true, play: false },
      { voterName: 'Bruno', brew: false, play: true }
    ], score)

    expect(table.cells).toHaveLength(4)
    expect(JSON.stringify(table.cells.at(-1))).toContain('2 pt')
    expect(JSON.stringify(table.cells.at(-1))).toContain('1 pt')
  })

  it('totals the score of the round', () => {
    const table = scoreSummaryTableBlock(score)

    expect(JSON.stringify(table.cells.at(-1))).toContain('12 pt')
  })

  it('shows zeros when the score is not available yet', () => {
    expect(JSON.stringify(scoreSummaryTableBlock(null).cells.at(-1))).toContain('0 pt')
  })
})
