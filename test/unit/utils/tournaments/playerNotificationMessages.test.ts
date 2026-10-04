// test\unit\utils\tournaments\playerNotificationMessages.test.ts
import { describe, expect, it } from 'vitest'
import {
  podAnnouncedMessage, registrationAcceptedMessage, roundTablesCancelledMessage,
  tournamentResetMessage
} from '#shared/utils/tournaments/playerNotificationMessages'

describe('podAnnouncedMessage', () => {
  const base = { tournamentName: 'Commander Night', roundNumber: 2, tableNumber: 3 }
  const you = { name: 'Io Stesso', isYou: true }
  const others = [{ name: 'A A', isYou: false }, { name: 'B B', isYou: false }, { name: 'C C', isYou: false }]

  it('shows a pod in seat order, with the recipient\'s own seat marked', () => {
    const text = podAnnouncedMessage({
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
    const text = podAnnouncedMessage({
      ...base,
      tableNumber: null,
      seats: [you, ...others]
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
