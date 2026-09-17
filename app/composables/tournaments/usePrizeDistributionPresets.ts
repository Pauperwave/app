// app\composables\tournaments\usePrizeDistributionPresets.ts
// Named distribution-shape presets for the prize suggestion — only touch
// decay/topCutoff (the "shape"), not totalPacks/minPacksPerPlayer (resource
// inputs the organizer sets independently). Same selectedPreset/apply
// pattern as usePairingPresets.ts.
import type { Ref } from 'vue'
import type { PrizeDistributionSettings } from '~/types'
import type { PrizeDistributionPresetKind } from '~/components/tournaments/single/prizes/PrizeDistributionPresetButtons.vue'

type PrizeDistributionShape = Pick<PrizeDistributionSettings, 'decay' | 'topCutoff'>

const FLAT_PRESET: PrizeDistributionShape = { decay: 1, topCutoff: 99 }
const BALANCED_PRESET: PrizeDistributionShape = { decay: 0.75, topCutoff: 8 }
const COMPETITIVE_PRESET: PrizeDistributionShape = { decay: 0.5, topCutoff: 4 }

function isCloseTo(a: number, b: number, epsilon = 0.001): boolean {
  return Math.abs(a - b) < epsilon
}

function sameShape(left: PrizeDistributionShape, right: PrizeDistributionShape): boolean {
  return isCloseTo(left.decay, right.decay) && isCloseTo(left.topCutoff, right.topCutoff)
}

export function usePrizeDistributionPresets(
  settings: Ref<PrizeDistributionSettings>,
  setSettings: (next: Partial<PrizeDistributionSettings>) => void
) {
  const selectedPreset = computed<PrizeDistributionPresetKind>(() => {
    const current = settings.value

    if (sameShape(current, BALANCED_PRESET)) return 'balanced'
    if (sameShape(current, FLAT_PRESET)) return 'flat'
    if (sameShape(current, COMPETITIVE_PRESET)) return 'competitive'

    return 'custom'
  })

  function applyDistributionPreset(kind: Exclude<PrizeDistributionPresetKind, 'custom'>) {
    if (kind === 'reset' || kind === 'balanced') {
      setSettings({ ...BALANCED_PRESET })
      return
    }

    if (kind === 'flat') {
      setSettings({ ...FLAT_PRESET })
      return
    }

    setSettings({ ...COMPETITIVE_PRESET })
  }

  return { selectedPreset, applyDistributionPreset }
}
