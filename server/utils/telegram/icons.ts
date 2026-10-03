// server\utils\telegram\icons.ts
// Single source of truth for every emoji in the Telegram bot, single-use ones included (like
// app/utils/icons.ts for the web app)
export const ICONS = {
  statusDraft: '📋',
  statusRegistrationOpen: '📝',
  statusInProgress: '🔄',
  statusCompleted: '✅',
  statusCancelled: '❌',
  statusExternal: '🏪',
  registrationCheckedIn: '🎯',
  registrationRegistered: '✅',
  registrationNone: '⚪',
  openDetails: 'ℹ️',
  // League headers, classifica headers and prize lines share one trophy glyph
  trophy: '🏆',
  date: '🗓️',
  location: '📍',
  calendar: '📅',
  directions: '🧭',
  ticket: '🎟️',
  membershipCard: '🪪',
  fee: '💶',
  // classificheMenu's own format-picker buttons.
  pauper: '👛',
  commander: '👑',
  premodern: '📜',
  cittadino: '🎖️'
} as const
