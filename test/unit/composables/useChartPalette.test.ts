// test\unit\composables\useChartPalette.test.ts
import { describe, expect, it } from 'vitest'
import { useChartPalette, CHART_PALETTE } from '~/composables/useChartPalette'

describe('useChartPalette', () => {
  it('returns colors in order for indices within the palette', () => {
    const { chartColor } = useChartPalette()
    expect(chartColor(0)).toBe(CHART_PALETTE[0])
    expect(chartColor(1)).toBe(CHART_PALETTE[1])
  })

  it('wraps around once the index exceeds the palette length', () => {
    const { chartColor } = useChartPalette()
    expect(chartColor(CHART_PALETTE.length)).toBe(CHART_PALETTE[0])
    expect(chartColor(CHART_PALETTE.length + 2)).toBe(CHART_PALETTE[2])
  })
})
