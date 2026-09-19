<!-- app\components\tournaments\single\pairing\PairingPresetButtons.vue -->
<!--
  Named weight-preset quick-select for the pairing optimizer's settings
  modal — ported from MagicTheGathering/league (user request, 2026-09-15).
  Options and labels only; the markup lives in the generic <PresetButtons>.
-->
<script setup lang="ts">
export type PairingPresetKind = 'balanced' | 'social' | 'competitive' | 'reset' | 'custom'

const { selected } = defineProps<{
  selected: PairingPresetKind
}>()

const emit = defineEmits<{
  select: [preset: Exclude<PairingPresetKind, 'custom'>]
}>()

const { t } = useI18n()

type PairingPresetOption = Exclude<PairingPresetKind, 'custom' | 'reset'>

const presets: Array<{ key: PairingPresetOption, label: string, icon: string }> = [
  { key: 'social', label: t('tournament.single.tablePreview.presets.social'), icon: ICONS.players },
  { key: 'balanced', label: t('tournament.single.tablePreview.presets.balanced'), icon: ICONS.rules },
  { key: 'competitive', label: t('tournament.single.tablePreview.presets.competitive'), icon: ICONS.standings }
]

// usePairingPresets' selectedPreset never returns 'reset' (it's an action, not
// a state); this only narrows the type for <PresetButtons>
const selectedOption = computed<PairingPresetOption | 'custom'>(() =>
  selected === 'reset' ? 'balanced' : selected)
</script>

<template>
  <PresetButtons
    :options="presets"
    :selected="selectedOption"
    :custom-label="t('tournament.single.tablePreview.presets.custom')"
    :reset-label="t('tournament.single.tablePreview.presets.reset')"
    @select="preset => emit('select', preset)"
    @reset="emit('select', 'reset')"
  />
</template>
