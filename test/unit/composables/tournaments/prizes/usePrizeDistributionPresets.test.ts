// test\unit\composables\tournaments\prizes\usePrizeDistributionPresets.test.ts
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePrizeDistributionPresets } from '~/composables/tournaments/prizes/usePrizeDistributionPresets'
import type { PrizeDistributionSettings } from '~/types'

function makeSettings(overrides: Partial<PrizeDistributionSettings>): PrizeDistributionSettings {
  return {
    totalPacks: 10,
    minPacksPerPlayer: 1,
    nonRewardedMinPacks: 0,
    reservedPacks: 0,
    maxPacksPerPlayer: 0,
    bonusShares: [40, 30, 20, 10],
    topCutoff: 8,
    ...overrides
  }
}

describe('usePrizeDistributionPresets', () => {
  it('detects the balanced preset shares', () => {
    const settings = ref(makeSettings({ bonusShares: [40, 30, 20, 10] }))
    const { selectedPreset } = usePrizeDistributionPresets(settings, vi.fn())
    expect(selectedPreset.value).toBe('balanced')
  })

  it('detects the flat preset shares for the current topCutoff', () => {
    const settings = ref(makeSettings({ bonusShares: [25, 25, 25, 25], topCutoff: 4 }))
    const { selectedPreset } = usePrizeDistributionPresets(settings, vi.fn())
    expect(selectedPreset.value).toBe('flat')
  })

  it('detects the competitive preset shares', () => {
    const settings = ref(makeSettings({ bonusShares: [60, 25, 10, 5] }))
    const { selectedPreset } = usePrizeDistributionPresets(settings, vi.fn())
    expect(selectedPreset.value).toBe('competitive')
  })

  it('reports custom when the shares match no known preset', () => {
    const settings = ref(makeSettings({ bonusShares: [50, 50] }))
    const { selectedPreset } = usePrizeDistributionPresets(settings, vi.fn())
    expect(selectedPreset.value).toBe('custom')
  })

  it('matches by proportion, so shares not summing to 100 still match', () => {
    const settings = ref(makeSettings({ bonusShares: [20, 15, 10, 5] }))
    const { selectedPreset } = usePrizeDistributionPresets(settings, vi.fn())
    expect(selectedPreset.value).toBe('balanced')
  })

  it('applyDistributionPreset sets the balanced shares', () => {
    const settings = ref(makeSettings({ bonusShares: [50, 50] }))
    const setSettings = vi.fn()
    const { applyDistributionPreset } = usePrizeDistributionPresets(settings, setSettings)

    applyDistributionPreset('balanced')
    expect(setSettings).toHaveBeenCalledWith({ bonusShares: [40, 30, 20, 10] })
  })

  it('applyDistributionPreset sets equal shares over the rewarded placements', () => {
    const settings = ref(makeSettings({ topCutoff: 4 }))
    const setSettings = vi.fn()
    const { applyDistributionPreset } = usePrizeDistributionPresets(settings, setSettings)

    applyDistributionPreset('flat')
    expect(setSettings).toHaveBeenCalledWith({ bonusShares: [25, 25, 25, 25] })
  })

  it('applyDistributionPreset sets the competitive shares', () => {
    const settings = ref(makeSettings({}))
    const setSettings = vi.fn()
    const { applyDistributionPreset } = usePrizeDistributionPresets(settings, setSettings)

    applyDistributionPreset('competitive')
    expect(setSettings).toHaveBeenCalledWith({ bonusShares: [60, 25, 10, 5] })
  })

  it('never touches topCutoff or the resource inputs', () => {
    const settings = ref(makeSettings({}))
    const setSettings = vi.fn()
    const { applyDistributionPreset } = usePrizeDistributionPresets(settings, setSettings)

    applyDistributionPreset('competitive')
    const patch = setSettings.mock.calls[0]?.[0] ?? {}
    expect(Object.keys(patch)).toEqual(['bonusShares'])
  })
})

describe('usePrizeDistributionPresets custom preset', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('has no custom shares until one is saved', () => {
    const settings = ref(makeSettings({}))
    const { hasCustomShares } = usePrizeDistributionPresets(settings, vi.fn())
    expect(hasCustomShares.value).toBe(false)
  })

  it('does nothing when "custom" is applied without saved shares', () => {
    const settings = ref(makeSettings({}))
    const setSettings = vi.fn()
    const { applyDistributionPreset } = usePrizeDistributionPresets(settings, setSettings)

    applyDistributionPreset('custom')
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('restores the saved shares when "custom" is applied', () => {
    const settings = ref(makeSettings({}))
    const setSettings = vi.fn()
    const { applyDistributionPreset, saveCustomShares, hasCustomShares }
      = usePrizeDistributionPresets(settings, setSettings)

    saveCustomShares([70, 20, 10])
    expect(hasCustomShares.value).toBe(true)

    applyDistributionPreset('custom')
    expect(setSettings).toHaveBeenCalledWith({ bonusShares: [70, 20, 10] })
  })

  it('persists the saved shares in localStorage', () => {
    const settings = ref(makeSettings({}))
    const { saveCustomShares } = usePrizeDistributionPresets(settings, vi.fn())

    saveCustomShares([70, 20, 10])
    return nextTick().then(() => {
      expect(localStorage.getItem('prize-distribution-custom-shares')).toBe('[70,20,10]')
    })
  })
})
