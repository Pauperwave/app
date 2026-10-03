<!-- app\components\tournaments\single\pairing\SwissMatchResultBadge.vue -->
<!-- A table's result status as a badge: no result yet (plain), or a result reported via
     Telegram, always "Inserito da X" regardless of confirm/dispute state, colored info while
     unanswered, success once confirmed, error once disputed (a dispute flags the result for
     organizer review, it doesn't revert it). Extracted from SwissMatchCard.vue (the largest,
     most stateful chunk of its template) and reused by SwissMatchTable.vue's result-cell, which
     had duplicated the state machine at a smaller size without the "no result at all" badge
     (that page's row background tint covers it) or the delete button (its "Azioni" column
     covers that). -->
<script setup lang="ts">
import type { MatchScore, SwissMatchTelegramInfo } from '~/types'

const {
  current = null,
  telegramInfo = null,
  size = 'md',
  showPendingBadge = true,
  showDeleteButton = true
} = defineProps<{
  current?: MatchScore | null
  telegramInfo?: SwissMatchTelegramInfo | null
  size?: 'sm' | 'md'
  // SwissMatchCard.vue's header badge shows this; SwissMatchTable.vue's more
  // compact result-cell relies on its own row tint (tableMeta) instead.
  showPendingBadge?: boolean
  // SwissMatchCard.vue's header pairs the badge with its own "Annulla
  // inserimento" button; SwissMatchTable.vue puts that same action in its
  // "Azioni" column instead, so it never needs this emit.
  showDeleteButton?: boolean
}>()

defineEmits<{
  clear: []
}>()

const { t } = useI18n()

// Full name, not just the first: two players sharing a first name (e.g. two "Alessandro"s at
// different tables) would be indistinguishable in a badge
function fullName(person: { name: string, surname?: string }): string {
  return `${person.name} ${person.surname ?? ''}`.trim()
}

const badgeColor = computed(() => {
  if (telegramInfo?.disputedAt) return 'error'
  if (telegramInfo?.confirmedAt) return 'success'
  return 'info'
})

const tooltipText = computed(() => {
  if (!telegramInfo) return ''
  const time = formatTimeOfDay(telegramInfo.reportedAt)
  if (telegramInfo.disputedAt) return t('tournament.single.roundManager.matchResultTelegramTooltipDisputed', { time })
  if (telegramInfo.confirmedAt) return t('tournament.single.roundManager.matchResultTelegramTooltipConfirmed', { time })
  return t('tournament.single.roundManager.matchResultTelegramTooltipPending', { time })
})
</script>

<template>
  <UBadge
    v-if="!current && showPendingBadge"
    :label="t('tournament.single.roundManager.matchResultPending')"
    color="warning"
    variant="subtle"
    :size="size"
  />
  <div v-else-if="current" class="flex items-center gap-1.5">
    <UTooltip v-if="telegramInfo" :text="tooltipText">
      <UBadge
        :label="t('tournament.single.roundManager.matchResultTelegramReported', {
          name: fullName(telegramInfo.reporter)
        })"
        :color="badgeColor"
        variant="subtle"
        :size="size"
      />
    </UTooltip>
    <UButton
      v-if="showDeleteButton"
      :label="t('tournament.single.roundManager.matchResultDeleteLabel')"
      :icon="ICONS.undo"
      color="error"
      variant="outline"
      size="xs"
      @click="$emit('clear')"
    />
  </div>
</template>
