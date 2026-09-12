// server\utils\telegram\icons.ts
// Single source of truth for every emoji used in the Telegram bot,
// including single-use ones — mirrors app/utils/icons.ts's role (and its
// dedup-identical-only-doesn't-apply-here policy) for the web app.
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
  // League headers, classifica/leaderboard headers, and prize lines all
  // reuse the same trophy glyph — one constant covers all three rather
  // than three identically-valued keys.
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
