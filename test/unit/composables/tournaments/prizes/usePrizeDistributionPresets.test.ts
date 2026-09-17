// test\unit\composables\tournaments\prizes\usePrizeDistributionPresets.test.ts
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { usePrizeDistributionPresets } from '~/composables/tournaments/prizes/usePrizeDistributionPresets'
import type { PrizeDistributionSettings } from '~/types'

function makeSettings(overrides: Partial<PrizeDistributionSettings>): PrizeDistributionSettings {
  return { totalPacks: 10, minPacksPerPlayer: 1, decay: 0.75, topCutoff: 8, ...overrides }
}

describe('usePrizeDistributionPresets', () => {
  it('detects the balanced preset shape', () => {
    const settings = ref(makeSettings({ decay: 0.75, topCutoff: 8 }))
    const { selectedPreset } = usePrizeDistributionPresets(settings, vi.fn())
    expect(selectedPreset.value).toBe('balanced')
  })

  it('detects the flat preset shape', () => {
    const settings = ref(makeSettings({ decay: 1, topCutoff: 99 }))
    const { selectedPreset } = usePrizeDistributionPresets(settings, vi.fn())
    expect(selectedPreset.value).toBe('flat')
  })

  it('detects the competitive preset shape', () => {
    const settings = ref(makeSettings({ decay: 0.5, topCutoff: 4 }))
    const { selectedPreset } = usePrizeDistributionPresets(settings, vi.fn())
    expect(selectedPreset.value).toBe('competitive')
  })

  it('reports custom when the shape matches no known preset', () => {
    const settings = ref(makeSettings({ decay: 0.9, topCutoff: 3 }))
    const { selectedPreset } = usePrizeDistributionPresets(settings, vi.fn())
    expect(selectedPreset.value).toBe('custom')
  })

  it('tolerates tiny floating-point drift when matching a preset', () => {
    const settings = ref(makeSettings({ decay: 0.7500001, topCutoff: 8 }))
    const { selectedPreset } = usePrizeDistributionPresets(settings, vi.fn())
    expect(selectedPreset.value).toBe('balanced')
  })

  it('applyDistributionPreset sets the balanced shape for both "balanced" and "reset"', () => {
    const settings = ref(makeSettings({ decay: 0.9, topCutoff: 3 }))
    const setSettings = vi.fn()
    const { applyDistributionPreset } = usePrizeDistributionPresets(settings, setSettings)

    applyDistributionPreset('balanced')
    expect(setSettings).toHaveBeenCalledWith({ decay: 0.75, topCutoff: 8 })

    applyDistributionPreset('reset')
    expect(setSettings).toHaveBeenCalledWith({ decay: 0.75, topCutoff: 8 })
  })

  it('applyDistributionPreset sets the flat shape', () => {
    const settings = ref(makeSettings({}))
    const setSettings = vi.fn()
    const { applyDistributionPreset } = usePrizeDistributionPresets(settings, setSettings)

    applyDistributionPreset('flat')
    expect(setSettings).toHaveBeenCalledWith({ decay: 1, topCutoff: 99 })
  })

  it('applyDistributionPreset sets the competitive shape', () => {
    const settings = ref(makeSettings({}))
    const setSettings = vi.fn()
    const { applyDistributionPreset } = usePrizeDistributionPresets(settings, setSettings)

    applyDistributionPreset('competitive')
    expect(setSettings).toHaveBeenCalledWith({ decay: 0.5, topCutoff: 4 })
  })
})
