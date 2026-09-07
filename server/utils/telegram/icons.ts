// server\utils\telegram\icons.ts
// Single source of truth for every emoji reused across more than one file
// in the Telegram bot — mirrors app/utils/icons.ts's role for the web app.
export const ICONS = {
  statusDraft: '📋',
  statusRegistrationOpen: '📝',
  statusInProgress: '🔄',
  statusCompleted: '✅',
  statusCancelled: '❌',
  statusExternal: '🏪',
  registrationCheckedIn: '🎯',
  registrationRegistered: '✅',
  registrationNone: '🎲'
} as const
