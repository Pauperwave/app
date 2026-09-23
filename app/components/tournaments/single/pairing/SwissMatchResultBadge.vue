<!-- app\components\tournaments\single\pairing\SwissMatchResultBadge.vue -->
<!-- A table's own result status, as a header badge: no result yet (plain,
     or a Telegram report pending/disputed), or a confirmed result (with an
     "Annulla inserimento" button, and a success badge naming who
     reported/confirmed it when that came via Telegram rather than an
     organizer entering it directly). Extracted out of SwissMatchCard.vue
     (2026-09-24) — this header logic was the single largest, most stateful
     chunk of that file's template. -->
<script setup lang="ts">
import type { MatchScore, SwissMatchConfirmedInfo, SwissMatchReport } from '~/types'

const { current = null, report = null, confirmedInfo = null } = defineProps<{
  current?: MatchScore | null
  report?: SwissMatchReport | null
  confirmedInfo?: SwissMatchConfirmedInfo | null
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
      size="md"
    />
  </UTooltip>
  <UBadge
    v-else-if="!current"
    :label="t('tournament.single.roundManager.matchResultPending')"
    color="warning"
    variant="subtle"
    size="md"
  />
  <div v-else class="flex items-center gap-1.5">
    <UBadge
      v-if="confirmedInfo"
      :label="t('tournament.single.roundManager.matchResultConfirmed', {
        reporter: fullName(confirmedInfo.reporter),
        confirmer: fullName(confirmedInfo.confirmer)
      })"
      color="success"
      variant="subtle"
      size="md"
    />
    <UButton
      :label="t('tournament.single.roundManager.matchResultDeleteLabel')"
      :icon="ICONS.undo"
      color="error"
      variant="outline"
      size="xs"
      @click="$emit('clear')"
    />
  </div>
</template>
