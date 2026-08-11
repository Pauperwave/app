// app\utils\navShortcuts.ts

// Single source of truth for the "g-x" navigation chords: useDashboard.ts
// builds its defineShortcuts config from this map, and default.vue's sidebar
// reads it to render the "press g" hint next to each item's label. Keeping
// both derived from one map means they can't drift apart the way two
// hand-written lists eventually would.
//
// Not every nav item has a chord: Impostazioni Generali has no free
// single-letter left (Statistiche took "s" — see
// docs/architecture/shortcuts.md), and Mazzi/Cittadino lost theirs on
// 2026-08-11 when "m"/"c" were reassigned to Membri/Calendario at the
// user's request — no replacement letter was picked for them.
//
// "g-g" specifically is never used for anything, deliberately: OS key-repeat
// fires multiple keydown events while "g" is held, and defineShortcuts reads
// the last two keystrokes as a chord — so holding "g" a beat too long reads
// as the chord "g-g" on its own. Any destination mapped there would fire
// just from holding the prefix key, not from a real two-key press.
export const NAV_SHORTCUTS: Record<string, string> = {
  '/': 'g-h',
  '/associates': 'g-a',
  '/players': 'g-i',
  '/transactions': 'g-n',
  '/wanted-cards': 'g-w',
  '/tournaments': 'g-t',
  '/leagues': 'g-l',
  '/events': 'g-e',
  '/calendar': 'g-c',
  '/finance': 'g-f',
  '/rulesets': 'g-r',
  '/statistics': 'g-s',
  '/settings/members': 'g-m',
  '/settings/permissions': 'g-p',
  '/settings/domains': 'g-d'
}
