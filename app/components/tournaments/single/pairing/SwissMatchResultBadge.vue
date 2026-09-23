<!-- app\components\tournaments\single\pairing\SwissMatchResultBadge.vue -->
<!-- A table's own result status, as a badge: no result yet (plain), or a
     result reported via Telegram — always "Inserita da X" regardless of
     confirm/dispute state, colored info while unanswered, success once
     confirmed, error once disputed (a dispute flags the result for
     organizer review, it doesn't revert it — user request, 2026-09-24).
     Extracted out of SwissMatchCard.vue (2026-09-24) — this header logic
     was the single largest, most stateful chunk of that file's template —
     then reused by SwissMatchTable.vue's own result-cell (2026-09-24),
     which had independently duplicated the same state machine at a smaller
     size and without the "no result at all" badge (that page's own row
     background tint already covers it) or the delete button (its own
     "Azioni" column covers that instead).
-->
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

// Full name, not just the first — two players sharing a first name (e.g.
// two "Alessandro"s at different tables) would otherwise be indistinguishable
// in a badge (2026-09-23 user request).
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
