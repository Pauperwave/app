// app\utils\associates\associateTypeBadge.ts
import type { BadgeProps } from '@nuxt/ui'
import type { Associate } from '~/types'

// Shared by useAssociatesRenderers.ts's table cell and associate/[slug].vue's
// profile-header badge (same "single config, used inline and in a table"
// pattern as MEMBERSHIP_STATUS_BADGE_CONFIG, membershipStatusBadge.ts) — was
// duplicated as a raw untranslated badge on the detail page before this.
// Reuses ICONS.player rather than a new "associate"-named constant for the
// same glyph (i-lucide-user) — ICONS.player already stands in for "a generic
// person" across the app (organizer selects, contacts, etc.), not just the
// players domain, and icons.ts's own header comment says to reuse an
// existing constant over introducing a second one for the same idea.
export const ASSOCIATE_TYPE_BADGE_CONFIG: Record<NonNullable<Associate['associate_type']>, { color: BadgeProps['color'], icon: string }> = {
  regular: { color: 'neutral', icon: ICONS.player },
  sustaining: { color: 'primary', icon: ICONS.userStar }
}
