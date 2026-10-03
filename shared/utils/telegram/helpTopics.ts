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

// What a help message can show: a single section or all of them
export type HelpView = HelpTopic | 'all'

const HELP_TOPIC_CALLBACK_PREFIX = 'helptopic:'

// callback_data of the buttons under /help that switch the message to another view
export function encodeHelpTopicCallback(view: HelpView): string {
  return `${HELP_TOPIC_CALLBACK_PREFIX}${view}`
}

// Null for anything that isn't one of ours: callback_data is client-controlled
export function decodeHelpTopicCallback(data: string): HelpView | null {
  if (!data.startsWith(HELP_TOPIC_CALLBACK_PREFIX)) return null

  const view = data.slice(HELP_TOPIC_CALLBACK_PREFIX.length)
  return view === 'all' ? 'all' : parseHelpTopic(view)
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
