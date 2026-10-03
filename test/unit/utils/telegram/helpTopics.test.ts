// test\unit\utils\telegram\helpTopics.test.ts
import { describe, expect, it } from 'vitest'
import {
  HELP_TOPICS,
  decodeHelpTopicCallback,
  encodeHelpTopicCallback,
  helpTopicPayload,
  parseHelpTopic
} from '#shared/utils/telegram/helpTopics'

describe('parseHelpTopic', () => {
  it.each(HELP_TOPICS)('recognizes %s', (topic) => {
    expect(parseHelpTopic(topic)).toBe(topic)
  })

  it('ignores case and surrounding spaces', () => {
    expect(parseHelpTopic('  Carte ')).toBe('carte')
  })

  it('maps supporto onto account', () => {
    expect(parseHelpTopic('supporto')).toBe('account')
  })

  it('returns null for an unknown topic', () => {
    expect(parseHelpTopic('boh')).toBeNull()
    expect(parseHelpTopic('')).toBeNull()
  })

  it('does not match inherited object keys', () => {
    expect(parseHelpTopic('constructor')).toBeNull()
  })
})

describe('helpTopicPayload', () => {
  it('only uses characters a t.me start payload allows', () => {
    for (const topic of HELP_TOPICS) {
      expect(helpTopicPayload(topic)).toMatch(/^[A-Za-z0-9_]+$/)
    }
  })
})

describe('help topic callbacks', () => {
  it.each([...HELP_TOPICS, 'all' as const])('round-trips %s', (view) => {
    expect(decodeHelpTopicCallback(encodeHelpTopicCallback(view))).toBe(view)
  })

  it('stays within the 64 bytes Telegram allows in callback_data', () => {
    for (const view of [...HELP_TOPICS, 'all' as const]) {
      expect(encodeHelpTopicCallback(view).length).toBeLessThanOrEqual(64)
    }
  })

  it('rejects another feature\'s callback and unknown views', () => {
    expect(decodeHelpTopicCallback('helpbtn:status')).toBeNull()
    expect(decodeHelpTopicCallback('helptopic:boh')).toBeNull()
    expect(decodeHelpTopicCallback('helptopic:')).toBeNull()
  })
})
