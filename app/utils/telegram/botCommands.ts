// app\utils\telegram\botCommands.ts

// The bot's commands as shown on the /telegram-bot info page, in the order of /help. The
// descriptions are in i18n (telegramBot.commands.items.<name>); the source of truth for what each
// command does is docs/telegram-bot/README.md.
export const TELEGRAM_BOT_COMMAND_GROUPS = [
  {
    id: 'general',
    commands: [
      { name: 'start', requiresLink: false },
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
      { name: 'scollegamento', requiresLink: true }
    ]
  },
  {
    id: 'tournament',
    commands: [
      { name: 'tavolo', requiresLink: true },
      { name: 'drop', requiresLink: true },
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
] as const
