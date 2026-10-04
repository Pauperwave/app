// test\unit\server\telegram\mentionsMessage.test.ts
import { describe, expect, it } from 'vitest'
import type { VoteMedal } from '../../../../shared/utils/commanders/voteMedals'
import {
  buildMentionsMessage,
  decksLine,
  type PlayerMentions
} from '../../../../server/utils/telegram/commands/account/mentionsMessage'

function medal(name: string, votes: number, partner: string | null = null): VoteMedal {
  return { deckUuid: `deck-${name}`, commander1Name: name, commander2Name: partner, votes }
}

const MENTIONS: PlayerMentions = {
  kills: 7,
  timesKilled: 3,
  brewVotes: 3,
  playVotes: 1,
  medals: {
    brew: [medal('Winota, Joiner of Forces', 2), medal('Krenko, Mob Boss', 1)],
    play: [medal('Tymna the Weaver', 1, 'Thrasios, Triton Hero')]
  }
}

type Message = ReturnType<typeof buildMentionsMessage>
type Block = NonNullable<Message['blocks']>[number]

// Flattens a rich text (string, array or styled node) to its plain characters
function plain(text: unknown): string {
  if (typeof text === 'string') return text
  if (Array.isArray(text)) return text.map(plain).join('')
  if (text && typeof text === 'object' && 'text' in text) return plain(text.text)
  return ''
}

function textOf(message: Message): string {
  return (message.blocks ?? [])
    .flatMap((block: Block) => (block.type === 'heading' || block.type === 'paragraph'
      ? [plain(block.text)]
      : []))
    .join('\n')
}

describe('decksLine', () => {
  it('lists the decks with how many times each earned the mention', () => {
    expect(decksLine([medal('Winota', 2), medal('Krenko', 1)])).toBe('Winota ×2 · Krenko')
  })

  it('shows both commanders of a pair', () => {
    expect(decksLine([medal('Tymna', 1, 'Thrasios')])).toBe('Tymna / Thrasios')
  })

  it('has nothing to say when no deck earned it', () => {
    expect(decksLine([])).toBeNull()
  })

  it('cuts a long list and says how many were left out', () => {
    const many = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(name => medal(name, 1))
    expect(decksLine(many)).toBe('A · B · C · D · E · e altri 2')
  })
})

describe('buildMentionsMessage', () => {
  it('shows the four mentions with their counts', () => {
    const text = textOf(buildMentionsMessage(MENTIONS))
    expect(text).toContain('Le tue menzioni')
    expect(text).toContain('Carnefice: 7')
    expect(text).toContain('Vittima: 3')
    expect(text).toContain('Master brewer: 3')
    expect(text).toContain('Player: 1')
  })

  it('lists the decks under master brewer and player only', () => {
    const text = textOf(buildMentionsMessage(MENTIONS))
    expect(text).toContain('Master brewer: 3\nWinota, Joiner of Forces ×2 · Krenko, Mob Boss')
    expect(text).toContain('Player: 1\nTymna the Weaver / Thrasios, Triton Hero')
    expect(text).toMatch(/Carnefice: 7\n\S+ Vittima: 3\n/)
  })

  it('explains where mentions come from when there are none yet', () => {
    const none: PlayerMentions = {
      kills: 0, timesKilled: 0, brewVotes: 0, playVotes: 0, medals: { brew: [], play: [] }
    }
    const text = textOf(buildMentionsMessage(none))
    expect(text).toContain('Carnefice: 0')
    expect(text).toContain('Non hai ancora nessuna menzione')
  })

  it('does not say there is nothing once there is something', () => {
    expect(textOf(buildMentionsMessage(MENTIONS))).not.toContain('Non hai ancora nessuna menzione')
  })
})
