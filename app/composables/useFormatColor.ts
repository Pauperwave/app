// app\composables\useFormatColor.ts
// Tint per MTG format — user-editable per mtg_formats.color (see
// mtgFormats/ManageModal.vue's UColorPicker, 2026-08-16) via the format
// row's own hex value, not a hardcoded map anymore. Applied by overriding
// --ui-primary locally rather than passing a Tailwind class. This app's
// semantic colour tokens (primary/success/...) are Tailwind v4 theme values
// that tailwind-merge's default config doesn't recognise as conflicting with
// each other, so `:class="..."` on a plain UBadge left the variant="subtle"
// compound's own bg-primary/10 and ring-primary/25 in place alongside a
// dynamic class. Every `subtle`-variant utility (bg-primary/*, text-primary,
// ring-primary/*) reads from --ui-primary, so overriding just that one
// custom property repaints bg/text/ring consistently, no class conflict to
// resolve, and works for an arbitrary hex the same way it works for a
// semantic token.
//
// The format name is spelled out directly next to/inside the badge, so
// colour is only ever reinforcement here — never the sole carrier of the
// format.
const NEUTRAL_CLASSES = 'bg-elevated text-muted'
const TINTED_CLASSES = 'bg-primary/15 text-primary'

// Legacy fallback for a format whose mtg_formats.color is still null (e.g.
// freshly created, never assigned a colour) — same tints the whole app used
// before the column existed, so nothing visibly changes for un-migrated rows.
const LEGACY_FORMAT_COLORS: Record<string, string> = {
  'Cubo Commander': 'var(--color-violet-500)',
  'Cubo Vintage': 'var(--ui-secondary)',
  'Draft': 'var(--ui-success)',
  'Sealed': 'var(--ui-error)',
  'Premodern': 'var(--ui-warning)',
  'Oldschool': 'var(--color-neutral-500)',
  'Pauper': 'var(--ui-info)'
}

// Reads the live mtg_formats list (Pinia Colada-cached, so this is cheap to
// call from every badge instance) to resolve a format name to its own
// colour, falling back to the legacy static map, then to no colour at all
// (NEUTRAL_CLASSES) for a name that matches neither.
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
