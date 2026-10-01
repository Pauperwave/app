// test\unit\utils\tournaments\playerNotificationMessages.test.ts
import { describe, expect, it } from 'vitest'
import {
  registrationAcceptedMessage, roundTablesCancelledMessage, tableAnnouncedMessage,
  tournamentResetMessage
} from '#shared/utils/tournaments/playerNotificationMessages'

describe('tableAnnouncedMessage', () => {
  const base = { tournamentName: 'Commander Night', roundNumber: 2, tableNumber: 3 }

  it('names the single opponent of a 1v1 table', () => {
    const text = tableAnnouncedMessage({ ...base, opponents: [{ name: 'Mario Rossi' }] })

    expect(text).toContain('🪑 Tavolo 3 · Commander Night · Round 2')
    expect(text).toContain('Giochi contro: Mario Rossi')
  })

  it('lists every opponent of a pod on its own line, as a bulleted list', () => {
    const text = tableAnnouncedMessage({
      ...base,
      opponents: [{ name: 'A A' }, { name: 'B B' }, { name: 'C C' }]
    })

    expect(text).toContain('Giochi con:\n- A A\n- B B\n- C C')
  })

  it('adds the Telegram nickname to whoever has one', () => {
    const text = tableAnnouncedMessage({
      ...base,
      opponents: [
        { name: 'A A', telegramUsername: 'alpha' },
        { name: 'B B' },
        { name: 'C C', telegramUsername: null }
      ]
    })

    expect(text).toContain('- A A (@alpha)\n- B B\n- C C')
  })

  it('adds the nickname to a single opponent too', () => {
    const text = tableAnnouncedMessage({
      ...base,
      opponents: [{ name: 'Mario Rossi', telegramUsername: 'mario' }]
    })

    expect(text).toContain('Giochi contro: Mario Rossi (@mario)')
  })

  it('falls back to a generic place when there is no table number', () => {
    const text = tableAnnouncedMessage({ ...base, tableNumber: null, opponents: [{ name: 'A A' }] })

    expect(text).toContain('🪑 Il tuo tavolo · Commander Night · Round 2')
  })
})

describe('other notification messages', () => {
  it('announces an acceptance with the tournament name', () => {
    expect(registrationAcceptedMessage('Pauper Cup')).toContain('Pauper Cup')
  })

  it('announces a cancelled round with its number', () => {
    const text = roundTablesCancelledMessage('Pauper Cup', 3)

    expect(text).toContain('Round 3')
    expect(text).toContain('Pauper Cup')
  })

  it('announces a reset tournament', () => {
    expect(tournamentResetMessage('Pauper Cup')).toContain('resettato')
  })
})
