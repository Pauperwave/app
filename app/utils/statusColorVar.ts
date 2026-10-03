// app\utils\statusColorVar.ts
import type { StatusColor } from '~/types'

// Resolves a StatusColor (the union badges use, see app/types/index.d.ts) to the Nuxt UI CSS custom
// property, for anything needing the raw color instead of a UBadge (e.g. chart bar fills), keeping
// badges and charts consistent
export function statusColorVar(color: StatusColor): string {
  if (color === 'neutral') return 'var(--color-neutral-500)'
  return `var(--ui-${color})`
}
