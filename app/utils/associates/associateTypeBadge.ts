// app\utils\associates\associateTypeBadge.ts
import type { BadgeProps } from '@nuxt/ui'
import type { Associate } from '~/types'

// Shared by useAssociatesRenderers.ts's table cell and associate/[slug].vue's profile-header badge
// ("single config, used inline and in a table", like MEMBERSHIP_STATUS_BADGE_CONFIG). Reuses
// ICONS.player (i-lucide-user), which already stands for "a generic person" across the app, rather
// than a second constant for the same glyph
export const ASSOCIATE_TYPE_BADGE_CONFIG: Record<NonNullable<Associate['associate_type']>, { color: BadgeProps['color'], icon: string }> = {
  regular: { color: 'neutral', icon: ICONS.player },
  sustaining: { color: 'primary', icon: ICONS.userStar }
}
