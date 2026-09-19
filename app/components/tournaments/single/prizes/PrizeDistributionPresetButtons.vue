<!-- app\components\tournaments\single\prizes\PrizeDistributionPresetButtons.vue -->
<!--
  Named distribution-shape quick-select for the prize suggestion panel —
  same shape as PairingPresetButtons.vue (user request, 2026-09-17: reuse
  the pairing weight-preset pattern for prize redistribution). Options and
  labels only; the markup lives in the generic <PresetButtons>. "Custom"
  restores the organizer's last hand-edited shares (disabled until one exists);
  "reset" puts every setting back to its starting value.
-->
<script setup lang="ts">
export type PrizeDistributionPresetKind = 'flat' | 'balanced' | 'competitive' | 'custom'

const { selected, hasCustom, resetDisabled = false } = defineProps<{
  selected: PrizeDistributionPresetKind
  hasCustom: boolean
  // Every setting is already at its starting value
  resetDisabled?: boolean
}>()

const emit = defineEmits<{
  select: [preset: PrizeDistributionPresetKind]
  reset: []
}>()

const { t } = useI18n()

const presets: Array<{
  key: Exclude<PrizeDistributionPresetKind, 'custom'>
  label: string
  icon: string
}> = [
  { key: 'flat', label: t('tournament.single.prizeDistribution.presets.flat'), icon: ICONS.players },
  { key: 'balanced', label: t('tournament.single.prizeDistribution.presets.balanced'), icon: ICONS.rules },
  { key: 'competitive', label: t('tournament.single.prizeDistribution.presets.competitive'), icon: ICONS.standings }
]
</script>

<template>
  <PresetButtons
    :options="presets"
    :selected="selected"
    :custom-label="t('tournament.single.prizeDistribution.presets.custom')"
    :reset-label="t('tournament.single.prizeDistribution.presets.reset')"
    :reset-disabled="resetDisabled"
    :custom-hint="t('tournament.single.prizeDistribution.presets.customHint')"
    :custom-disabled="!hasCustom"
    custom-clickable
    @select="preset => emit('select', preset)"
    @reset="emit('reset')"
    @custom="emit('select', 'custom')"
  />
</template>
