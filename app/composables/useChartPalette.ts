// app\composables\useChartPalette.ts
// Qualitative palette for chart series with no domain-specific color (unlike tournament formats,
// colored by useFormatColor.ts, or membership status, whose badge colors carry meaning). Derived
// from the app's primary (app.config.ts ui.primary: 'indigo',
// #6366F1) via TheColorAPI's triad/quad/complement schemes
// (https://www.thecolorapi.com/scheme?hex=6366F1&mode=...), so charts read as "part of this app"
// instead of an arbitrary pick
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
