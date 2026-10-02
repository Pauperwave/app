<!-- app\components\tournaments\single\pairing\DropBadge.vue -->
<!-- Drop icon + "R{n}" next to a player's name; renders nothing for someone who has not dropped.
     Hovering names the round, and with `withTime` also when they dropped. -->
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
    :text="withTime
      ? t('tournament.single.roundManager.dropBadgeTooltip', {
        round: dropped.roundNumber,
        time: formatTimeOfDay(dropped.droppedAt)
      })
      : t('tournament.single.roundManager.dropBadgeRoundTooltip', { round: dropped.roundNumber })"
  >
    <UBadge
      :label="t('tournament.single.roundManager.dropBadge', { round: dropped.roundNumber })"
      :icon="ICONS.drop"
      color="warning"
      variant="subtle"
      size="md"
      class="h-7"
    />
  </UTooltip>
</template>
