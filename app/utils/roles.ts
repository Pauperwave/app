// app\utils\roles.ts
import type { AppRole } from '~/types'

// Increasing-authority iconography — player (user) -> organizer (user with a
// gear, "manages/operates") -> admin (shielded user) -> super_admin
// (terminal, "Sviluppatore"). Was only defined inline in UserMenu.vue's own
// "view as" menu (2026-08-17) until a third call site (MembersList.vue's
// role select, usePlayersRowActions.ts's "Promuovi a" submenu) made it worth
// extracting (2026-08-25 user request).
export const ROLE_ICON: Record<AppRole, string> = {
  player: ICONS.player,
  organizer: ICONS.userRoundCog,
  admin: ICONS.shieldUser,
  super_admin: ICONS.terminal
}
