// test\unit\server\telegram\iscriviti.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  iscrivitiBlocks,
  type OpenTournament
} from '../../../../server/utils/telegram/commands/tournaments/iscriviti'

type Block = NonNullable<ReturnType<typeof iscrivitiBlocks>>[number]

function makeTournament(overrides: Partial<OpenTournament> = {}): OpenTournament {
  return {
    uuid: '0b6b4d3a-8a0e-4b6a-9c3e-5d2f4a1b7c90',
    name: 'Pauper Night',
    startsAt: '2026-11-06T19:00:00Z',
    locationName: null,
    stageNumber: null,
    registration: null,
    ...overrides
  }
}

function buttonsOf(blocks: Block[]) {
  return blocks.flatMap(block => (block.type === 'buttons' ? block.buttons : []))
}

describe('iscrivitiBlocks', () => {
  beforeEach(() => {
    vi.stubGlobal('formatTelegramDate', (date: string) => date)
  })

  it('points to the calendar when no tournament has registrations open', () => {
    const buttons = buttonsOf(iscrivitiBlocks([]) ?? [])

    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toMatchObject({ callback_data: 'helpbtn:calendario' })
  })

  it('asks for a confirmation when there is a single tournament', () => {
    const buttons = buttonsOf(iscrivitiBlocks([makeTournament()]) ?? [])

    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toMatchObject({
      text: expect.stringContaining('Conferma iscrizione'),
      callback_data: 'iscriviti:0b6b4d3a-8a0e-4b6a-9c3e-5d2f4a1b7c90'
    })
  })

  it('gives each tournament its own register button when there are several', () => {
    const buttons = buttonsOf(iscrivitiBlocks([
      makeTournament({ uuid: 'first' }),
      makeTournament({ uuid: 'second' })
    ]) ?? [])

    expect(buttons.map(button => 'callback_data' in button && button.callback_data))
      .toEqual(['iscriviti:first', 'iscriviti:second'])
    expect(buttons[0]).toMatchObject({ text: expect.stringContaining('Iscriviti') })
  })

  it('offers to cancel a registration the player already has', () => {
    const buttons = buttonsOf(iscrivitiBlocks([makeTournament({ registration: 'registered' })]) ?? [])

    expect(buttons[0]).toMatchObject({
      text: expect.stringContaining('Annulla iscrizione'),
      callback_data: 'annulla:0b6b4d3a-8a0e-4b6a-9c3e-5d2f4a1b7c90'
    })
  })

  it('has no button once the player has checked in', () => {
    const blocks = iscrivitiBlocks([makeTournament({ registration: 'checked_in' })]) ?? []

    expect(buttonsOf(blocks)).toHaveLength(0)
  })
})
