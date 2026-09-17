<!-- app\components\tournaments\single\prizes\PrizeDistributionPresetButtons.vue -->
<!--
  Named distribution-shape quick-select for the prize suggestion panel —
  same shape as PairingPresetButtons.vue (user request, 2026-09-17: reuse
  the pairing weight-preset pattern for prize redistribution).
-->
<script setup lang="ts">
export type PrizeDistributionPresetKind = 'flat' | 'balanced' | 'competitive' | 'reset' | 'custom'

const { selected } = defineProps<{
  selected: PrizeDistributionPresetKind
}>()

const emit = defineEmits<{
  select: [preset: Exclude<PrizeDistributionPresetKind, 'custom'>]
}>()

const { t } = useI18n()

const presets: Array<{ key: Exclude<PrizeDistributionPresetKind, 'custom' | 'reset'>, label: string, icon: string }> = [
  { key: 'flat', label: t('tournament.single.prizeDistribution.presets.flat'), icon: ICONS.players },
  { key: 'balanced', label: t('tournament.single.prizeDistribution.presets.balanced'), icon: ICONS.rules },
  { key: 'competitive', label: t('tournament.single.prizeDistribution.presets.competitive'), icon: ICONS.standings }
]
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <UFieldGroup>
      <UButton
        v-for="option in presets"
        :key="option.key"
        :icon="option.icon"
        :color="selected === option.key ? 'primary' : 'neutral'"
        :variant="selected === option.key ? 'soft' : 'outline'"
        @click="emit('select', option.key)"
      >
        {{ option.label }}
      </UButton>
    </UFieldGroup>

    <UButton
      :icon="ICONS.rotateBack"
      color="warning"
      variant="soft"
      @click="emit('select', 'reset')"
    >
      {{ t('tournament.single.prizeDistribution.presets.reset') }}
    </UButton>

    <UButton
      :icon="ICONS.filters"
      :color="selected === 'custom' ? 'primary' : 'neutral'"
      :variant="selected === 'custom' ? 'soft' : 'outline'"
      class="pointer-events-none select-none"
    >
      {{ t('tournament.single.prizeDistribution.presets.custom') }}
    </UButton>
  </div>
</template>
