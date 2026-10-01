<!-- app\components\tournaments\single\pairing\DropBadge.vue -->
<!-- "Drop R{n}" next to a player's name; renders nothing for someone who has not dropped. With
     `withTime`, hovering also tells when they dropped. -->
<script setup lang="ts">
import type { SwissDropInfo } from '~/types'

const { dropped, withTime = false } = defineProps<{
  dropped: SwissDropInfo | null
  withTime?: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <UTooltip
    v-if="dropped"
    :disabled="!withTime"
    :text="t('tournament.single.roundManager.dropBadgeTooltip', {
      round: dropped.roundNumber,
      time: formatTimeOfDay(dropped.droppedAt)
    })"
  >
    <UBadge
      :label="t('tournament.single.roundManager.dropBadge', { round: dropped.roundNumber })"
      color="warning"
      variant="subtle"
      size="sm"
    />
  </UTooltip>
</template>
