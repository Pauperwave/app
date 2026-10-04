// app\utils\telegram\botCommands.ts

import { helpTopicPayload, type HelpTopic } from '#shared/utils/telegram/helpTopics'
import { tournamentLinkPayload } from '#shared/utils/telegram/tournamentLink'

export const TELEGRAM_BOT_URL = 'https://t.me/PauperwaveBot'

interface BotCommand {
  name: string
  requiresLink: boolean
  // The t.me start payload that opens the command in Telegram: undefined = the command's own
  // name, '' = just the bot, null = no link (commands that act at once, so a stray tap on a
  // web page must not run them). The bot resolves payloads in deepLinks.ts.
  startPayload?: string | null
}

export function botCommandUrl(command: BotCommand): string | null {
  const payload = command.startPayload === undefined ? command.name : command.startPayload
  if (payload === null) return null
  return payload === '' ? TELEGRAM_BOT_URL : `${TELEGRAM_BOT_URL}?start=${payload}`
}

interface BotCommandGroup {
  id: string
  // The /help section this card mirrors: its button opens that section in Telegram
  helpTopic: HelpTopic
  commands: BotCommand[]
}

export function botHelpTopicUrl(group: BotCommandGroup): string {
  return `${TELEGRAM_BOT_URL}?start=${helpTopicPayload(group.helpTopic)}`
}

// Opens the tournament's detail view in the bot, where a player can register
export function tournamentTelegramUrl(tournamentUuid: string): string {
  return `${TELEGRAM_BOT_URL}?start=${tournamentLinkPayload(tournamentUuid)}`
}

// The bot's commands as shown on the /telegram-bot info page, one card per /help section and in
// its order. The descriptions are in i18n (telegramBot.commands.items.<name>); the source of truth
// for what each command does is docs/telegram-bot/README.md.
export const TELEGRAM_BOT_COMMAND_GROUPS: BotCommandGroup[] = [
  {
    id: 'general',
    helpTopic: 'generale',
    commands: [
      { name: 'start', requiresLink: false, startPayload: '' },
      { name: 'help', requiresLink: false },
      { name: 'status', requiresLink: false },
      { name: 'crediti', requiresLink: false }
    ]
  },
  {
    id: 'rankings',
    helpTopic: 'classifiche',
    commands: [{ name: 'classifiche', requiresLink: false }]
  },
  {
    id: 'tournaments',
    helpTopic: 'tornei',
    commands: [
      { name: 'eventi', requiresLink: false },
      { name: 'calendario', requiresLink: false },
      { name: 'leghe', requiresLink: false },
      { name: 'prossimo', requiresLink: false },
      { name: 'tavolo', requiresLink: true },
      { name: 'drop', requiresLink: true, startPayload: null },
      { name: 'turni', requiresLink: false }
    ]
  },
  {
    id: 'registrations',
    helpTopic: 'iscrizioni',
    commands: [{ name: 'iscrizioni', requiresLink: true }]
  },
  {
    id: 'cards',
    helpTopic: 'carte',
    commands: [
      { name: 'prezzo', requiresLink: false },
      { name: 'cercate', requiresLink: true },
      { name: 'importa', requiresLink: true }
    ]
  },
  {
    id: 'dice',
    helpTopic: 'dadi',
    commands: [
      { name: 'dado', requiresLink: false },
      { name: 'moneta', requiresLink: false },
      { name: 'tira', requiresLink: false }
    ]
  },
  {
    id: 'account',
    helpTopic: 'account',
    commands: [
      { name: 'tessera', requiresLink: true },
      { name: 'menzioni', requiresLink: true },
      { name: 'collegamento', requiresLink: false },
      { name: 'scollegamento', requiresLink: true, startPayload: null },
      { name: 'supporto', requiresLink: false }
    ]
  }
]
