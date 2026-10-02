// test\unit\utils\tournaments\playerNotificationMessages.test.ts
import { describe, expect, it } from 'vitest'
import {
  registrationAcceptedMessage, roundTablesCancelledMessage, tableAnnouncedMessage,
  tournamentResetMessage
} from '#shared/utils/tournaments/playerNotificationMessages'

describe('tableAnnouncedMessage', () => {
  const base = { tournamentName: 'Commander Night', roundNumber: 2, tableNumber: 3 }
  const you = { name: 'Io Stesso', isYou: true }

  it('names the single opponent of a 1v1 table', () => {
    const text = tableAnnouncedMessage({ ...base, seats: [you, { name: 'Mario Rossi', isYou: false }] })

    expect(text).toContain('🪑 Tavolo 3 · Commander Night · Round 2')
    expect(text).toContain('Giochi contro: Mario Rossi')
    expect(text).not.toContain('posto')
  })

  it('adds the nickname to a single opponent too', () => {
    const text = tableAnnouncedMessage({
      ...base,
      seats: [{ name: 'Mario Rossi', telegramUsername: 'mario', isYou: false }, you]
    })

    expect(text).toContain('Giochi contro: Mario Rossi (@mario)')
  })

  it('shows a pod in seat order, with the recipient\'s own seat marked', () => {
    const text = tableAnnouncedMessage({
      ...base,
      seats: [
        { name: 'A A', telegramUsername: 'alpha', isYou: false },
        you,
        { name: 'C C', isYou: false },
        { name: 'D D', telegramUsername: null, isYou: false }
      ]
    })

    expect(text).toBe([
      '🪑 Tavolo 3 · Commander Night · Round 2',
      '💺 Sei al posto 2',
      '',
      'Al tavolo:',
      '1. A A (@alpha)',
      '2. 👉 Tu',
      '3. C C',
      '4. D D',
      '',
      'Per inserire il risultato usa /tavolo.'
    ].join('\n'))
  })

  it('falls back to a generic place when there is no table number', () => {
    const text = tableAnnouncedMessage({
      ...base,
      tableNumber: null,
      seats: [you, { name: 'A A', isYou: false }]
    })

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
