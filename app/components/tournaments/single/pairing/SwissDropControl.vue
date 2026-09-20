<!-- app\components\tournaments\single\pairing\SwissDropControl.vue -->
<!-- Marks a player as dropped (from the next round on), or shows and undoes an existing drop. -->
<script setup lang="ts">
import type { SwissDropInfo } from '~/types'

const { dropped = null } = defineProps<{
  dropped?: SwissDropInfo | null
}>()

const emit = defineEmits<{
  toggle: []
}>()

const { t } = useI18n()

const droppedAtTime = computed(() => dropped
  ? new Date(dropped.droppedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  : '')
</script>

<template>
  <UTooltip
    v-if="dropped"
    :text="t('tournament.single.roundManager.dropUndoTooltip', {
      round: dropped.roundNumber,
      time: droppedAtTime
    })"
  >
    <UButton
      :label="t('tournament.single.roundManager.dropBadge', { round: dropped.roundNumber })"
      color="warning"
      variant="soft"
      size="xs"
      @click="emit('toggle')"
    />
  </UTooltip>
  <UTooltip v-else :text="t('tournament.single.roundManager.dropTooltip')">
    <UButton
      :icon="ICONS.drop"
      :aria-label="t('tournament.single.roundManager.dropTooltip')"
      color="neutral"
      variant="ghost"
      size="xs"
      @click="emit('toggle')"
    />
  </UTooltip>
</template>
