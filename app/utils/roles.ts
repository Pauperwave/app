// app\utils\roles.ts
import type { BadgeProps } from '@nuxt/ui'
import type { AppRole } from '~/types'

// Increasing-authority iconography: player (user) -> organizer (user with a gear) -> admin
// (shielded user) -> super_admin (terminal, "Sviluppatore"). Shared by UserMenu.vue,
// MembersList.vue and usePlayersRowActions.ts
export const ROLE_ICON: Record<AppRole, string> = {
  player: ICONS.player,
  organizer: ICONS.userRoundCog,
  admin: ICONS.shieldUser,
  super_admin: ICONS.terminal
}

// Badge colors for RoleBadge.vue, deliberately not the ROLE_ICON authority scale: super_admin
// ("Sviluppatore") blue, admin red, organizer yellow
export const ROLE_COLOR: Record<AppRole, BadgeProps['color']> = {
  player: 'neutral',
  organizer: 'warning',
  admin: 'error',
  super_admin: 'info'
}
