// test\unit\server\telegram\mentionsMessage.test.ts
import { describe, expect, it } from 'vitest'
import type { MentionDeck, PlayerMentions } from '../../../../shared/utils/players/playerMentions'
import {
  buildMentionsMessage,
  decksLine
} from '../../../../server/utils/telegram/commands/account/mentionsMessage'

function deck(name: string, mentions: number, partner: string | null = null): MentionDeck {
  return { deckUuid: `deck-${name}`, commander1Name: name, commander2Name: partner, mentions }
}

const MENTIONS: PlayerMentions = {
  killer: 7,
  victim: 3,
  brewer: 3,
  player: 1,
  brewerDecks: [deck('Winota, Joiner of Forces', 2), deck('Krenko, Mob Boss', 1)],
  playerDecks: [deck('Tymna the Weaver', 1, 'Thrasios, Triton Hero')]
}

const NONE: PlayerMentions = {
  killer: 0, victim: 0, brewer: 0, player: 0, brewerDecks: [], playerDecks: []
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
    expect(decksLine([deck('Winota', 2), deck('Krenko', 1)])).toBe('Winota ×2 · Krenko')
  })

  it('shows both commanders of a pair', () => {
    expect(decksLine([deck('Tymna', 1, 'Thrasios')])).toBe('Tymna / Thrasios')
  })

  it('has nothing to say when no deck earned it', () => {
    expect(decksLine([])).toBeNull()
  })

  it('cuts a long list and says how many were left out', () => {
    const many = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(name => deck(name, 1))
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

  it('explains how to get a mention when there are none yet', () => {
    const text = textOf(buildMentionsMessage(NONE))
    expect(text).toContain('Carnefice: 0')
    expect(text).toContain('arrivando primo in una classifica a fine torneo')
  })

  it('does not say there is nothing once there is something', () => {
    expect(textOf(buildMentionsMessage(MENTIONS))).not.toContain('Nessuna menzione per ora')
  })
})
