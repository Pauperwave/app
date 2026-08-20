<!-- app\components\leagues\single\PresentationCard.vue -->
<!--
  Extracted out of leagues/[leagueId]/index.vue (2026-08-20) once it stopped
  being a one-off — the league-detail page's own header card: name, ruleset,
  "Dal ... al ..." date range, and tournament-completion progress. No image
  (dropped 2026-08-20, user request — this card's whole value is information
  density, not a cover photo) and no status badge (also dropped the same
  session, kept to name + edit button only).
-->
<script setup lang="ts">
import type { League } from '~/types'

const { league, endDate, onEdit } = defineProps<{
  league: League
  /**
   * League has no endDate column of its own (app/types/index.d.ts) — pass
   * the last tournament's date instead, the closest real signal for when the
   * league actually wraps up. Omit the "al ..." half of the date line
   * entirely when null (no tournaments yet).
   */
  endDate?: string | null
  onEdit: (league: League) => void
}>()

const { t } = useI18n()
</script>

<template>
  <UCard>
    <div class="flex flex-col gap-3">
      <div class="flex items-start justify-between gap-3">
        <h2 class="text-xl font-semibold truncate">
          {{ league.name }}
        </h2>
        <div class="flex items-center gap-2 shrink-0">
          <UButton
            :label="t('league.rowActions.edit')"
            :icon="ICONS.edit"
            color="neutral"
            variant="subtle"
            size="sm"
            @click="onEdit(league)"
          />
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
        <span v-if="league.ruleset" class="flex items-center gap-1.5">
          <UIcon :name="ICONS.bookOpen" class="size-4 shrink-0" />
          {{ league.ruleset }}
        </span>
        <span class="flex items-center gap-1.5 flex-wrap">
          <UIcon :name="ICONS.calendar" class="size-4 shrink-0" />
          {{ t('league.detail.dateRange.from') }}
          <DateWithRelativeTooltip :iso-string="league.startDate" :time="false" />
          <template v-if="endDate">
            {{ t('league.detail.dateRange.to') }}
            <DateWithRelativeTooltip :iso-string="endDate" :time="false" />
          </template>
        </span>
      </div>

      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between text-sm text-muted">
          <span>{{ t('league.tournamentsLabel') }}</span>
          <span>{{ t('league.progress', {
            completed: league.completedTournamentCount, total: league.tournamentCount
          }) }}</span>
        </div>
        <UProgress
          :model-value="league.tournamentCount
            ? Math.round((league.completedTournamentCount / league.tournamentCount) * 100)
            : 0"
          size="sm"
        />
      </div>
    </div>
  </UCard>
</template>
