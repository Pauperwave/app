<!-- app\components\tournaments\single\Awards.vue -->
<!-- End-of-tournament "highlight" awards, ported from league's TournamentAwards.vue. Reads
     useLiveCommanderStandings.ts directly (already final once the tournament has ended) rather
     than a separate standings+victimCounts pair. -->
<script setup lang="ts">
import type { LiveCommanderStanding } from '~/composables/tournaments/pairing/useLiveCommanderStandings'

const { tournamentUuid, standings } = defineProps<{
  tournamentUuid: string
  standings: LiveCommanderStanding[]
}>()

const { t } = useI18n()

const standingsRef = toRef(() => standings)
const awards = useTournamentAwards(standingsRef)

// The player whose "pagella" is open, same modal as the standings table's.
const reportOpen = ref(false)
const reportPlayerUuid = ref<string | null>(null)
const reportPlayer = computed(() =>
  standings.find(standing => standing.playerUuid === reportPlayerUuid.value) ?? null)

function openReport(playerUuid: string) {
  reportPlayerUuid.value = playerUuid
  reportOpen.value = true
}
</script>

<template>
  <div v-if="awards.length > 0" class="space-y-2">
    <h3 class="font-semibold text-lg flex items-center gap-2">
      <UIcon :name="ICONS.standings" class="text-primary" />
      {{ t('tournament.single.awards.sectionTitle') }}
    </h3>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="award in awards"
        :key="award.kind"
        class="space-y-2"
      >
        <TournamentsSingleTournamentAwardCard
          :kind="award.kind"
          :winners="award.winners"
        />

        <TournamentsSingleTournamentAwardRanking
          :kind="award.kind"
          :ranking="award.ranking"
          @select-player="openReport"
        />
      </div>
    </div>

    <TournamentsSinglePairingCommanderPlayerReportModal
      v-model:open="reportOpen"
      :tournament-uuid="tournamentUuid"
      :standings="standings"
      :player="reportPlayer"
      @select-player="openReport"
    />
  </div>
</template>
