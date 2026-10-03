// app\composables\useFormatColor.ts
// Tint per MTG format, user-editable via mtg_formats.color (mtgFormats/ManageModal.vue's
// UColorPicker), no longer a hardcoded map. Applied by overriding --ui-primary locally rather than
// a Tailwind class: this app's semantic color tokens are Tailwind v4 theme values that
// tailwind-merge doesn't see as conflicting, so `:class` on a plain UBadge left the
// variant="subtle" compound's own bg-primary/10 and ring-primary/25 next to the dynamic class.
// Every `subtle` utility (bg-primary/*, text-primary, ring-primary/*) reads --ui-primary, so
// overriding that one property repaints bg/text/ring consistently, for an arbitrary hex as for a
// semantic token.
//
// The format name is always spelled out next to the badge, so color only reinforces it.
const NEUTRAL_CLASSES = 'bg-elevated text-muted'
const TINTED_CLASSES = 'bg-primary/15 text-primary'

// Legacy fallback for a format whose mtg_formats.color is still null: the tints used before the
// column existed
const LEGACY_FORMAT_COLORS: Record<string, string> = {
  'Cubo Commander': 'var(--color-violet-500)',
  'Cubo Vintage': 'var(--ui-secondary)',
  'Draft': 'var(--ui-success)',
  'Sealed': 'var(--ui-error)',
  'Premodern': 'var(--ui-warning)',
  'Oldschool': 'var(--color-neutral-500)',
  'Pauper': 'var(--ui-info)'
}

// Reads the live mtg_formats list (Pinia Colada-cached, cheap per badge) to resolve a format name
// to its color, falling back to the legacy static map, then to no color (NEUTRAL_CLASSES)
export function useFormatColor() {
  const { data: formats } = useMtgFormatsQuery()

  function formatColor(format: string): string | undefined {
    const dbColor = formats.value?.find(row => row.name === format)?.color
    return dbColor ?? LEGACY_FORMAT_COLORS[format]
  }

  function formatColorClass(format: string): string {
    return formatColor(format) ? TINTED_CLASSES : NEUTRAL_CLASSES
  }

  return { formatColor, formatColorClass }
}
