// app\utils\telegram\botCommands.ts

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

// The bot's commands as shown on the /telegram-bot info page, in the order of /help. The
// descriptions are in i18n (telegramBot.commands.items.<name>); the source of truth for what each
// command does is docs/telegram-bot/README.md.
export const TELEGRAM_BOT_COMMAND_GROUPS: { id: string, commands: BotCommand[] }[] = [
  {
    id: 'general',
    commands: [
      { name: 'start', requiresLink: false, startPayload: '' },
      { name: 'help', requiresLink: false },
      { name: 'status', requiresLink: false }
    ]
  },
  {
    id: 'competitions',
    commands: [
      { name: 'classifiche', requiresLink: false },
      { name: 'eventi', requiresLink: false },
      { name: 'calendario', requiresLink: false },
      { name: 'leghe', requiresLink: false },
      { name: 'prossimo', requiresLink: false },
      { name: 'iscrizioni', requiresLink: true }
    ]
  },
  {
    id: 'profile',
    commands: [
      { name: 'tessera', requiresLink: true },
      { name: 'collegamento', requiresLink: false },
      { name: 'scollegamento', requiresLink: true, startPayload: null }
    ]
  },
  {
    id: 'tournament',
    commands: [
      { name: 'tavolo', requiresLink: true },
      { name: 'drop', requiresLink: true, startPayload: null },
      { name: 'turni', requiresLink: false }
    ]
  },
  {
    id: 'cards',
    commands: [
      { name: 'prezzo', requiresLink: false },
      { name: 'cercate', requiresLink: true },
      { name: 'importa', requiresLink: true }
    ]
  },
  {
    id: 'dice',
    commands: [
      { name: 'dado', requiresLink: false },
      { name: 'moneta', requiresLink: false },
      { name: 'tira', requiresLink: false }
    ]
  },
  {
    id: 'support',
    commands: [{ name: 'supporto', requiresLink: false }]
  }
]
