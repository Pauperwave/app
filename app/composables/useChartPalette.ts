// app\composables\useChartPalette.ts
// Qualitative palette for chart series that have no domain-specific color of
// their own (unlike e.g. tournament formats, which already have a
// per-format color everywhere in the app via useFormatColor.ts, or
// membership status, whose success/warning/error/neutral badge colors carry
// real meaning — renewed elsewhere, not just picked for this chart). Derived
// from the app's actual primary (app.config.ts's ui.primary: 'indigo',
// #6366F1) via TheColorAPI's triad/quad/complement schemes
// (https://www.thecolorapi.com/scheme?hex=6366F1&mode=...), so every chart
// using it reads as "part of this app" instead of an arbitrary color pick.
export const CHART_PALETTE = [
  'var(--ui-primary)', // indigo — the app's own primary, always first
  '#E64E54', // coral red (triad)
  '#5DEC5D', // green (triad)
  '#EBE859', // amber/yellow (quad)
  '#E64E9D', // pink/magenta (quad)
  '#22D3EE' // cyan — rounds out the wheel alongside indigo
] as const

export function useChartPalette() {
  function chartColor(index: number): string {
    return CHART_PALETTE[index % CHART_PALETTE.length]!
  }

  return { chartPalette: CHART_PALETTE, chartColor }
}
