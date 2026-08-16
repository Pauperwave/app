// shared\utils\formatColors.ts
// Tint per MTG format — originally cittadino-only (the matrix's day/month
// chip), now shared by every format badge in the app (calendar cards,
// cittadino standings, tournaments grid/table).
//
// Semantic tokens wherever possible, so the tints follow the theme (see
// app/app.config.ts: primary indigo, secondary pink, success lime, info cyan,
// warning yellow, error rose, neutral zinc). There are eight formats against
// seven tokens, so Cubo Commander falls back to a palette hue — violet, chosen
// because it sits next to primary/indigo and therefore reads as part of the same
// Commander family.
//
// The format name is spelled out directly next to/inside the badge, so colour
// is only ever reinforcement here — never the sole carrier of the format.
const FORMAT_COLOR_CLASSES: Record<string, string> = {
  'Commander': 'bg-primary/15 text-primary',
  'Cubo Commander': 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  'Cubo Vintage': 'bg-secondary/15 text-secondary',
  'Draft': 'bg-success/15 text-success',
  'Sealed': 'bg-error/15 text-error',
  'Premodern': 'bg-warning/15 text-warning',
  'Oldschool': 'bg-neutral-500/15 text-neutral-600 dark:text-neutral-300',
  'Pauper': 'bg-info/15 text-info'
}

export function formatColorClass(format: string): string {
  return FORMAT_COLOR_CLASSES[format] ?? 'bg-elevated text-muted'
}

// Same tint as the class map above, as a raw colour rather than a Tailwind
// class — for consumers that paint a CSS custom property directly (e.g. the
// cittadino matrix's column hover highlight, or FormatBadge.vue overriding
// --ui-primary locally so a UBadge's own bg-primary/text-primary/ring-primary
// utilities all repaint consistently). `--color-*` covers the two formats
// with no semantic token (Cubo Commander's violet, Oldschool's neutral/zinc).
// No entry for Commander on purpose: it's already the app's primary colour
// (app.config.ts), so FormatBadge.vue's UBadge just needs its own default
// `color="primary"` — no override needed. A `var(--color-indigo-500)` entry
// was tried (2026-08-16) to sidestep a `--ui-primary: var(--ui-primary)`
// self-reference (CSS treats that as a guaranteed-invalid value, silently
// breaking Commander's colour), but a hardcoded palette shade doesn't adapt
// between light/dark mode the way `--ui-primary` itself does, and read
// visibly darker in dark mode — omitting the override avoids both problems.
const FORMAT_COLORS: Record<string, string> = {
  'Cubo Commander': 'var(--color-violet-500)',
  'Cubo Vintage': 'var(--ui-secondary)',
  'Draft': 'var(--ui-success)',
  'Sealed': 'var(--ui-error)',
  'Premodern': 'var(--ui-warning)',
  'Oldschool': 'var(--color-neutral-500)',
  'Pauper': 'var(--ui-info)'
}

export function formatColor(format: string): string | undefined {
  return FORMAT_COLORS[format]
}
