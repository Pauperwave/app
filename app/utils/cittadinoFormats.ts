// app\utils\cittadinoFormats.ts

// The formats the association actually runs (confirmed by the user 2026-08-09).
// Order matters only for the legend; the colour is what the matrix uses.
export const CITTADINO_FORMATS = [
  'Commander',
  'Cubo Commander',
  'Cubo Vintage',
  'Draft',
  'Sealed',
  'Premodern',
  'Pauper',
  'Oldschool'
]

// Tint per format, carried by the day/month chip in each matrix column header so
// that runs of the same format read as a block across ~24 columns.
//
// Semantic tokens wherever possible, so the tints follow the theme (see
// app/app.config.ts: primary indigo, secondary pink, success lime, info cyan,
// warning yellow, error rose, neutral zinc). There are eight formats against
// seven tokens, so Cubo Commander falls back to a palette hue — violet, chosen
// because it sits next to primary/indigo and therefore reads as part of the same
// Commander family.
//
// The event name is spelled out directly above the chip, so colour is only ever
// reinforcement here — never the sole carrier of the format.
const CITTADINO_FORMAT_CLASSES: Record<string, string> = {
  'Commander': 'bg-primary/15 text-primary',
  'Cubo Commander': 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  'Cubo Vintage': 'bg-secondary/15 text-secondary',
  'Draft': 'bg-success/15 text-success',
  'Sealed': 'bg-error/15 text-error',
  'Premodern': 'bg-warning/15 text-warning',
  'Oldschool': 'bg-neutral-500/15 text-neutral-600 dark:text-neutral-300',
  'Pauper': 'bg-info/15 text-info'
}

export function cittadinoFormatClass(format: string): string {
  return CITTADINO_FORMAT_CLASSES[format] ?? 'bg-elevated text-muted'
}
