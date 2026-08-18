// app\utils\statusColorVar.ts
import type { StatusColor } from '~/types'

// Resolves a StatusColor (the same union badges use, see app/types/index.d.ts)
// to the matching Nuxt UI CSS custom property — for anything that needs the
// raw color value instead of a UBadge (e.g. chart bar fills), so status
// colors stay consistent between badges and charts without duplicating the
// success/warning/error/neutral choice per domain.
export function statusColorVar(color: StatusColor): string {
  if (color === 'neutral') return 'var(--color-neutral-500)'
  return `var(--ui-${color})`
}
