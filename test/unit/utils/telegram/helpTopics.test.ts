// test\unit\utils\telegram\helpTopics.test.ts
import { describe, expect, it } from 'vitest'
import {
  HELP_TOPICS,
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
