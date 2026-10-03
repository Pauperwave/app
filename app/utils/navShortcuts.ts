// app\utils\navShortcuts.ts

// Single source of truth for the "g-x" navigation chords: useDashboard.ts builds its
// defineShortcuts config from this map and default.vue's sidebar reads it for the "press g" hint,
// so the two can't drift.
//
// Not every nav item has a chord: Impostazioni Generali has no free letter left (see
// docs/architecture/shortcuts.md), and Mazzi/Cittadino lost theirs when "m"/"c" went to
// Membri/Calendario.
//
// "g-g" is deliberately never used: OS key-repeat fires several keydowns while "g" is held, and
// defineShortcuts reads the last two keystrokes as a chord, so any destination there would fire
// just from holding the prefix key.
export const NAV_SHORTCUTS: Record<string, string> = {
  '/associates': 'g-a',
  '/players': 'g-i',
  '/transactions': 'g-n',
  '/wanted-cards': 'g-w',
  '/tournaments': 'g-t',
  '/leagues': 'g-l',
  '/events': 'g-e',
  '/calendar': 'g-c',
  '/finance': 'g-f',
  '/associates/requests': 'g-r',
  '/statistics': 'g-s',
  '/settings/members': 'g-m',
  '/settings/permissions': 'g-p',
  '/settings/domains': 'g-d',
  // "c" is already Calendario's, so "x" was picked (see shortcuts.md)
  '/trash': 'g-x'
}
