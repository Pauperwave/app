// app\composables\tournaments\prizes\usePrizeDistributionPresets.ts
// Named distribution-shape presets for the prize suggestion — only touch
// bonusShares, never topCutoff (rewarded placements) or the resource inputs
// (totalPacks/minPacksPerPlayer). Same selectedPreset/apply pattern as
// usePairingPresets.ts. The "custom" preset is the organizer's own shares,
// remembered in localStorage (not per tournament) so it can be restored.
import type { Ref } from 'vue'
import type { PrizeDistributionSettings } from '~/types'
import type { PrizeDistributionPresetKind } from '~/components/tournaments/single/prizes/PrizeDistributionPresetButtons.vue'
// Explicit import, not auto-import — see CLAUDE.md's useStorage
// auto-import-collision note (Nitro's server-side useStorage shadows
// VueUse's client composable of the same name).
import { useStorage } from '@vueuse/core'

const CUSTOM_SHARES_STORAGE_KEY = 'prize-distribution-custom-shares'

const BALANCED_SHARES = [40, 30, 20, 10]
const COMPETITIVE_SHARES = [60, 25, 10, 5]

// Same share for every rewarded placement
function flatShares(topCutoff: number): number[] {
  const count = Math.max(1, topCutoff)
  return Array.from({ length: count }, () => Math.round((100 / count) * 10) / 10)
}

// Compare the shapes by proportion, so 20/15/10/5 still matches 40/30/20/10
function normalized(shares: number[], length: number): number[] {
  const padded = Array.from({ length }, (_, rank) => Math.max(0, shares[rank] ?? 0))
  const total = padded.reduce((sum, share) => sum + share, 0)
  return total > 0 ? padded.map(share => share / total) : padded
}

function sameShape(left: number[], right: number[], length: number, epsilon = 0.005): boolean {
  const normalizedLeft = normalized(left, length)
  const normalizedRight = normalized(right, length)
  return normalizedLeft.every(
    (share, rank) => Math.abs(share - (normalizedRight[rank] ?? 0)) < epsilon
  )
}

export function usePrizeDistributionPresets(
  settings: Ref<PrizeDistributionSettings>,
  setSettings: (next: Partial<PrizeDistributionSettings>) => void
) {
  // Empty array = nothing saved yet (an array default gets VueUse's JSON serializer)
  const customShares = useStorage<number[]>(CUSTOM_SHARES_STORAGE_KEY, [], undefined, {
    initOnMounted: true
  })
  const hasCustomShares = computed(() => customShares.value.length > 0)

  const selectedPreset = computed<PrizeDistributionPresetKind>(() => {
    const { bonusShares, topCutoff } = settings.value
    const length = Math.max(topCutoff, bonusShares.length)

    if (sameShape(bonusShares, BALANCED_SHARES, length)) return 'balanced'
    if (sameShape(bonusShares, flatShares(topCutoff), length)) return 'flat'
    if (sameShape(bonusShares, COMPETITIVE_SHARES, length)) return 'competitive'

    return 'custom'
  })

  // Called after every manual share/pack edit, so "custom" always restores the last one
  function saveCustomShares(shares: number[]) {
    customShares.value = [...shares]
  }

  function applyDistributionPreset(kind: PrizeDistributionPresetKind) {
    if (kind === 'custom') {
      if (hasCustomShares.value) setSettings({ bonusShares: [...customShares.value] })
      return
    }

    if (kind === 'balanced') {
      setSettings({ bonusShares: [...BALANCED_SHARES] })
      return
    }

    if (kind === 'flat') {
      setSettings({ bonusShares: flatShares(settings.value.topCutoff) })
      return
    }

    setSettings({ bonusShares: [...COMPETITIVE_SHARES] })
  }

  return { selectedPreset, hasCustomShares, saveCustomShares, applyDistributionPreset }
}
