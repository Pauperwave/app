<!-- app\components\tournaments\single\SwissRoundManager.vue -->
<!--
  1v1 Swiss-format round view — Phase 1 of
  docs/plans/2026-09-15-swiss-pairing-draft-1v1-plan.md: pairings only
  (table N: player A vs player B) plus advance/turn-back, no match-result
  entry yet (phase 2) and no real standings yet (phase 3, needs
  tournament_match_results-backed scoring first). Replaces the stub
  RoundManager.vue for Draft (after its pod stage) and every plain-Swiss
  format — see index.vue's own #round-${i} slot and is1v1Format.
-->
<script setup lang="ts">
import type { TablePlayer } from '~/types'

const {
  tournamentUuid, roundNumber, roundCount, autoOpenAdvancePreview = false
} = defineProps<{
  tournamentUuid: string
  roundNumber: number
  roundCount: number
  // See CommanderRoundManager.vue's own comment on this prop (same
  // "turning back round N reopens round N-1's own next-round preview"
  // mechanism, user request 2026-09-18).
  autoOpenAdvancePreview?: boolean
}>()

const emit = defineEmits<{
  turnedBack: []
  advancePreviewAutoOpened: []
}>()

const { t } = useI18n()

const { data: rounds } = useTournamentRoundsQuery(() => tournamentUuid)
const { data: pairings } = useTournamentPairingsQuery(() => tournamentUuid)
const { data: registrations } = useTournamentRegistrationsQuery(() => tournamentUuid)
const { data: associatesData } = useAssociatesQuery()

const round = computed(() => rounds.value?.find(r => r.roundNumber === roundNumber) ?? null)
const isLastRoundOfTournament = computed(() => roundNumber >= roundCount)

const associateByPlayerUuid = computed(() => {
  const map = new Map<string, string>()
  for (const registration of registrations.value ?? []) {
    map.set(registration.playerUuid, registration.associateUuid)
  }
  return map
})
const associatesByUuid = computed(() =>
  new Map((associatesData.value ?? []).map(a => [a.uuid, a])))

function labelFor(playerUuid: string): string {
  const associateUuid = associateByPlayerUuid.value.get(playerUuid)
  const associate = associateUuid ? associatesByUuid.value.get(associateUuid) : undefined
  return associate ? `${associate.first_name} ${associate.last_name}` : playerUuid
}
function associateUuidFor(playerUuid: string): string | undefined {
  return associateByPlayerUuid.value.get(playerUuid)
}

const pairingsForRound = computed(() =>
  (pairings.value ?? []).filter(p => p.roundUuid === round.value?.uuid))

function tablePlayersFor(pairing: { playerUuids: string[] }): TablePlayer[] {
  return pairing.playerUuids.map(playerUuid => ({ value: playerUuid, label: labelFor(playerUuid) }))
}

// ─── Advance / turn back round ──────────────────────────────────────────────
const { advanceRoundSwiss, turnBackRoundSwiss }
  = useTournamentSwissRoundsMutations(() => tournamentUuid)
const advancePreviewOpen = ref(false)

// No standings to seed the next round from yet (phase 3) — carry over this
// round's own seating order, same continuity idea as Commander's
// nextRoundSeedPlayers. Unlike tablePlayersFor (used for on-screen display,
// keyed by players.uuid same as Commander's own pairing cards),
// SwissTablePreviewModal's confirm hands this straight to
// advance_swiss_round's p_associate_order, which resolves against
// players.associate_uuid — value here MUST be the associate uuid, not the
// player uuid, or the RPC can't resolve anyone (confirmed live: "Could not
// resolve every associate to a registered player of this tournament").
const nextRoundSeedPlayers = computed<TablePlayer[]>(() =>
  pairingsForRound.value.flatMap(pairing => pairing.playerUuids
    .map((playerUuid) => {
      const associateUuid = associateUuidFor(playerUuid)
      return associateUuid ? { value: associateUuid, label: labelFor(playerUuid) } : null
    })
    .filter((player): player is TablePlayer => player !== null)))

function openAdvancePreview() {
  advancePreviewOpen.value = true
}

async function onAdvanceConfirm(associateOrder: string[]) {
  try {
    await advanceRoundSwiss.mutateAsync({ currentRoundNumber: roundNumber, associateOrder })
    advancePreviewOpen.value = false
  } catch { /* toasted by the mutation's own onError */ }
}

async function endTournament() {
  try {
    await advanceRoundSwiss.mutateAsync({ currentRoundNumber: roundNumber })
  } catch { /* toasted by the mutation's own onError */ }
}

async function onTurnBack() {
  try {
    await turnBackRoundSwiss.mutateAsync(roundNumber)
    emit('turnedBack')
  } catch { /* toasted by the mutation's own onError */ }
}

watch(() => autoOpenAdvancePreview, (value) => {
  if (!value) return
  advancePreviewOpen.value = true
  emit('advancePreviewAutoOpened')
}, { immediate: true })
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <UButton
        :label="t('tournament.single.roundManager.turnBackButton')"
        :icon="ICONS.undo"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="onTurnBack"
      />

      <UButton
        v-if="!isLastRoundOfTournament"
        :label="t('tournament.single.roundManager.advanceButton')"
        :icon="ICONS.chevronRight"
        trailing
        @click="openAdvancePreview"
      />
      <UButton
        v-else
        :label="t('tournament.single.roundManager.endTournamentButton')"
        :icon="ICONS.standings"
        color="primary"
        :loading="advanceRoundSwiss.isLoading.value"
        @click="endTournament"
      />
    </div>

    <div v-if="pairingsForRound.length" class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <UCard v-for="pairing in pairingsForRound" :key="pairing.uuid">
        <template #header>
          <span class="font-medium">
            {{ t('tournament.single.swissTablePreview.tableNumber', {
              n: pairing.tableNumber ?? 0
            }) }}
          </span>
        </template>

        <div class="flex items-center justify-center gap-3 text-sm">
          <span
            v-for="(player, index) in tablePlayersFor(pairing)"
            :key="player.value"
          >
            <span v-if="index > 0" class="text-muted mx-1">
              {{ t('tournament.single.roundManager.versusSeparator') }}
            </span>
            {{ player.label }}
          </span>
        </div>
      </UCard>
    </div>
    <EmptyState v-else :message="t('tournament.single.roundManager.noPairings')" />
  </div>

  <TournamentsSinglePairingSwissTablePreviewModal
    v-model:open="advancePreviewOpen"
    :players="nextRoundSeedPlayers"
    :loading="advanceRoundSwiss.isLoading.value"
    @confirm="onAdvanceConfirm"
  />
</template>
