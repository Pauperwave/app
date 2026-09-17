<!-- app\components\tournaments\single\Awards.vue -->
<!--
  End-of-tournament "highlight" awards — ported from
  MagicTheGathering/league's TournamentAwards.vue (user request 2026-09-16:
  build this for real instead of the placeholder it was). Reads
  useLiveCommanderStandings.ts directly (already final by the time the
  tournament has ended) rather than a separate standings+victimCounts pair.
-->
<script setup lang="ts">
import type { LiveCommanderStanding } from '~/composables/tournaments/useLiveCommanderStandings'

const { standings } = defineProps<{
  standings: LiveCommanderStanding[]
}>()

const { t } = useI18n()

const standingsRef = toRef(() => standings)
const awards = useTournamentAwards(standingsRef)
</script>

<template>
  <div v-if="awards.length > 0" class="space-y-2">
    <h3 class="font-semibold text-lg flex items-center gap-2">
      <UIcon :name="ICONS.standings" class="text-primary" />
      {{ t('tournament.single.awards.sectionTitle') }}
    </h3>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <TournamentsSingleTournamentAwardCard
        v-for="award in awards"
        :key="award.kind"
        :kind="award.kind"
        :associate-uuid="award.associateUuid"
        :label="award.label"
        :value="award.value"
      />
    </div>
  </div>
</template>
