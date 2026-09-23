<!-- app\components\tournaments\single\pairing\SwissMatchResultBadge.vue -->
<!-- A table's own result status, as a badge: no result yet (plain, or a
     Telegram report pending/disputed), or a confirmed result (a success
     badge naming who reported/confirmed it when that came via Telegram
     rather than an organizer entering it directly). Extracted out of
     SwissMatchCard.vue (2026-09-24) — this header logic was the single
     largest, most stateful chunk of that file's template — then reused by
     SwissMatchTable.vue's own result-cell (2026-09-24), which had
     independently duplicated the same state machine at a smaller size and
     without the "no result, no report at all" badge (that page's own row
     background tint already covers it) or the delete button (its own
     "Azioni" column covers that instead).
-->
<script setup lang="ts">
import type { MatchScore, SwissMatchConfirmedInfo, SwissMatchReport } from '~/types'

const {
  current = null,
  report = null,
  confirmedInfo = null,
  size = 'md',
  showPendingBadge = true,
  showDeleteButton = true
} = defineProps<{
  current?: MatchScore | null
  report?: SwissMatchReport | null
  confirmedInfo?: SwissMatchConfirmedInfo | null
  size?: 'sm' | 'md'
  // SwissMatchCard.vue's header badge shows this; SwissMatchTable.vue's more
  // compact result-cell relies on its own row tint (tableMeta) instead.
  showPendingBadge?: boolean
  // SwissMatchCard.vue's header pairs the confirmed badge with its own
  // "Annulla inserimento" button; SwissMatchTable.vue puts that same action
  // in its "Azioni" column instead, so it never needs this emit.
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
</script>

<template>
  <UTooltip
    v-if="!current && report"
    :text="t('tournament.single.roundManager.matchResultReportedScore', {
      score: `${report.score.player1GamesWon}-${report.score.player2GamesWon}`
    })"
  >
    <UBadge
      :label="report.status === 'disputed'
        ? t('tournament.single.roundManager.matchResultDisputed', {
          name: fullName(report.reporter)
        })
        : t('tournament.single.roundManager.matchResultReported', {
          name: fullName(report.reporter)
        })"
      :color="report.status === 'disputed' ? 'error' : 'info'"
      variant="subtle"
      :size="size"
    />
  </UTooltip>
  <UBadge
    v-else-if="!current && showPendingBadge"
    :label="t('tournament.single.roundManager.matchResultPending')"
    color="warning"
    variant="subtle"
    :size="size"
  />
  <div v-else-if="current" class="flex items-center gap-1.5">
    <UBadge
      v-if="confirmedInfo"
      :label="t('tournament.single.roundManager.matchResultConfirmed', {
        reporter: fullName(confirmedInfo.reporter),
        confirmer: fullName(confirmedInfo.confirmer)
      })"
      color="success"
      variant="subtle"
      :size="size"
    />
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
