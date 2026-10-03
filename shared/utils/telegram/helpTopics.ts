// shared\utils\telegram\helpTopics.ts

// The sections /help can show on their own ("/help carte"), shared by the bot and the
// /telegram-bot info page, whose cards each open one of them.
export type HelpTopic = (typeof HELP_TOPICS)[number]

// Alternative names that land on a topic
const TOPIC_ALIASES = new Map<string, HelpTopic>([['supporto', 'account']])

// Null for anything that isn't a topic: the caller decides whether that means "show everything"
export function parseHelpTopic(raw: string): HelpTopic | null {
  const name = raw.trim().toLowerCase()
  const known = HELP_TOPICS.find(topic => topic === name)
  return known ?? TOPIC_ALIASES.get(name) ?? null
}

// The t.me start payload that opens a topic; payloads are limited to [A-Za-z0-9_]
export function helpTopicPayload(topic: HelpTopic): string {
  return `help_${topic}`
}

// Declared last: an export right after an array literal is dropped from Nuxt's auto-imports
export const HELP_TOPICS = [
  'generale',
  'classifiche',
  'tornei',
  'iscrizioni',
  'carte',
  'dadi',
  'account'
] as const
