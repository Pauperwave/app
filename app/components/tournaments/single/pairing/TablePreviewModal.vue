<!-- app\components\tournaments\single\pairing\TablePreviewModal.vue -->
<!--
  Table preview modal with drag-and-drop editing, pairing constraints,
  optimizer controls, and transparent score breakdown — ported from
  MagicTheGathering/league's TablePreviewModal.vue (user request,
  2026-09-15: reuse league's real drag-and-drop/optimizer UI, replacing the
  simplified shuffle-only PodsManager.vue path for Commander).

  Round-1-only for now: this modal builds its OWN initial pod split from
  `players` (via useCommanderPods' buildPreviewPods) rather than receiving
  an already-persisted PairingTable[] prop like league's own modal does —
  there is nothing persisted yet before the organizer confirms (that's
  exactly what start_commander_round_one, called on `confirm`, creates).
  Round 2+ (re-pairing already-seated players against real standings) is
  separate follow-up work, not covered here.

  History/rank signals the real optimizer wants (playersForScoring/
  history/leagueRematchCounts) have no cross-tournament plumbing in this
  app yet — omitted below (useTablePairingDnd's own fallback seeds
  rank=registration order, score=0, table3Count=0 for an empty list, same
  as league's own zero-signal cold-start case). Wire these for real once
  that history data exists — search "STUB:" in this file.
-->
<script setup lang="ts">
import type { PairingWeights, TablePlayer, PairingTable } from '~/types'

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const toast = useToast()

const {
  players,
  tournamentUuid,
  currentRound = 1,
  loading = false,
  dismissible = true
} = defineProps<{
  players: TablePlayer[]
  tournamentUuid: string
  currentRound?: number
  loading?: boolean
  dismissible?: boolean
}>()

const emit = defineEmits<{
  confirm: [associateOrder: string[]]
  cancel: []
}>()

const showSettings = ref(false)
const showTableScoreBreakdown = ref(false)
const selectedTableIndex = ref<number | null>(null)
const pairPlayerA = ref('')
const pairPlayerB = ref('')
const hasAutoOptimized = ref(false)

const { data: avoidPairsData } = useAvoidPairsQuery()
const { addAvoidPair, removeAvoidPair } = useAvoidPairsMutations()

// Sequential slice into pods (biggest tables first) — the same "no
// optimizer yet" starting point buildPreviewPods already gives Draft's
// PodsManager.vue; the optimizer below immediately reshuffles this into a
// real scored arrangement once the modal opens.
const { buildPreviewPods } = useCommanderPods()

function buildInitialTables(playersList: TablePlayer[]): PairingTable[] {
  const pods = buildPreviewPods(playersList.map(player => player.value))
  const playerByValue = new Map(playersList.map(player => [player.value, player]))

  return pods.map((podIds, index) => ({
    id: `round-${currentRound}-table-${index + 1}`,
    tableNumber: index + 1,
    seats: podIds.map(id => ({
      id: `round-${currentRound}-table-${index + 1}-player-${id}`,
      player: playerByValue.get(id) ?? null
    }))
  }))
}

const pairingWeights = usePairingWeights(tournamentUuid)

const {
  localTables,
  isDragging,
  isValid,
  previewError,
  playerOrder,
  tableStatus,
  setDragging,
  reset,
  syncFromSource,
  normalizeLocalTables,
  updateTableSeats,
  cloneCurrentTables,
  restoreTables,
  runOptimizer,
  randomizeTables,
  scoreDetails,
  weights,
  forbiddenPairs,
  setWeights,
  setForbiddenPairs,
  conflictingTables
} = useTablePairingDnd(buildInitialTables(players), {
  // STUB: no cross-tournament rank/score/table3Count history yet — falls
  // back internally to registration order / zeroed signals.
  currentRound: () => currentRound,
  initialWeights: pairingWeights.value,
  initialForbiddenPairs: avoidPairsData.value ?? []
})

watch(
  () => players,
  (playersList) => {
    syncFromSource(buildInitialTables(playersList))
  },
  { deep: true }
)

watch(open, (value) => {
  if (value) {
    hasAutoOptimized.value = false
    reset()
    setWeights(pairingWeights.value)
    setForbiddenPairs(avoidPairsData.value ?? [])
  }
})

watch(avoidPairsData, (pairs) => {
  setForbiddenPairs(pairs ?? [])
})

// League's current behavior runs the optimizer even at round 1 (not just
// round 2+) — an earlier "round 1 is pure random" design was superseded
// once cross-tournament table3Count history became available from round 1
// onward (see the optimizer's own docs). This app has none of that history
// yet (see the STUB above), but running the optimizer is still strictly
// better than the initial sequential slice for the signals it DOES have
// (novelty/strength-balance all default to neutral with zeroed input, so
// this is a no-op today and becomes real once the history plumbing lands).
watch(
  () => [open.value, loading, localTables.value.length] as const,
  ([isOpen, isLoading]) => {
    if (!isOpen || isLoading || hasAutoOptimized.value) return
    if (!localTables.value.length) return
    runOptimizer(140)
    hasAutoOptimized.value = true
  }
)

watch(weights, (value) => {
  pairingWeights.value = value
}, { deep: true })

const scoreItems = computed(() => [
  { key: 'strengthBalance' as const, label: t('tournament.single.tablePreview.weightLabels.strengthBalance'), value: weights.value.strengthBalance, min: 0, max: 3, step: 0.1 },
  { key: 'novelty' as const, label: t('tournament.single.tablePreview.weightLabels.novelty'), value: weights.value.novelty, min: 0, max: 3, step: 0.1 },
  { key: 'rematch' as const, label: t('tournament.single.tablePreview.weightLabels.rematch'), value: weights.value.rematch, min: 0, max: 3, step: 0.1 },
  { key: 'rotateTable3' as const, label: t('tournament.single.tablePreview.weightLabels.rotateTable3'), value: weights.value.rotateTable3, min: 0, max: 3, step: 0.1 },
  { key: 'tableSize4' as const, label: t('tournament.single.tablePreview.weightLabels.tableSize4'), value: weights.value.tableSize4, min: -2, max: 2, step: 0.05 },
  { key: 'tableSize3' as const, label: t('tournament.single.tablePreview.weightLabels.tableSize3'), value: weights.value.tableSize3, min: -2, max: 2, step: 0.05 }
])

function handleConfirm() {
  normalizeLocalTables()
  if (!isValid.value) return
  emit('confirm', playerOrder.value)
}

function handleCancel() {
  open.value = false
  emit('cancel')
}

function tableCardClass(table: PairingTable): string {
  if (conflictingTables.value.has(table.id)) {
    return 'bg-error/10 ring-1 ring-inset ring-error/30'
  }

  const status = tableStatus(table).color
  if (status === 'warning') return 'bg-warning/10 ring-1 ring-inset ring-warning/30'
  if (status === 'error') return 'bg-error/10 ring-1 ring-inset ring-error/30'
  return 'bg-muted/20'
}

function updateWeight(key: keyof PairingWeights, value: number) {
  setWeights({ [key]: Number(value.toFixed(2)) })
}

async function addForbiddenPairFromSelectors() {
  if (!pairPlayerA.value || !pairPlayerB.value || pairPlayerA.value === pairPlayerB.value) return

  await addAvoidPair.mutateAsync({ playerA: pairPlayerA.value, playerB: pairPlayerB.value })
  pairPlayerA.value = ''
  pairPlayerB.value = ''
}

async function removeForbiddenPairFromModal(playerA: string, playerB: string) {
  await removeAvoidPair.mutateAsync({ playerA, playerB })
}

const { selectedPreset, applyWeightPreset } = usePairingPresets(weights, setWeights)

const { optimizeNow: optimizePreviewTables, autoResolveConflicts } = useOptimizationNotifier({
  toast,
  isValid,
  previewError,
  scoreDetails,
  cloneCurrentTables,
  restoreTables,
  runOptimizer
})

function optimizeNow() {
  if (loading) return
  optimizePreviewTables()
}

function randomizeNow() {
  if (loading) return
  randomizeTables()
}

function handleDragStart() {
  setDragging(true)
}

// No forced revert/swap-detection on drop — a drag can freely leave tables
// in an intermediate, temporarily-invalid shape (e.g. moving one player
// out of a table without immediately moving someone back). tableStatus()'s
// per-table badge already gives live feedback; isValid/previewError gate
// the confirm button — validity only actually matters at confirm time.
function handleDragEnd() {
  setDragging(false)
}

const selectedTableScore = computed(() => {
  if (selectedTableIndex.value === null) return null
  return scoreDetails.value.tableScores[selectedTableIndex.value] ?? null
})

const selectedTablePlayers = computed(() => {
  if (selectedTableIndex.value === null) return []

  const table = localTables.value[selectedTableIndex.value]
  if (!table) return []

  return table.seats
    .map(seat => seat.player)
    .filter((player): player is TablePlayer => player !== null)
})

const selectedTablePlayerRows = computed(() => {
  const score = selectedTableScore.value
  if (!score) return []

  const scoreByPlayer = new Map(score.players.map(item => [item.playerId, item]))
  return selectedTablePlayers.value.map(player => ({
    player,
    detail: scoreByPlayer.get(player.value),
    // STUB: no cross-tournament table3Count history yet, see file header.
    table3Count: 0
  }))
})

const modalMaxWidth = computed(() => (localTables.value.length <= 1 ? 'max-w-3xl' : 'max-w-6xl'))

function tableScoreForIndex(tableIndex: number): number {
  return scoreDetails.value.tableScores[tableIndex]?.total ?? 0
}

function openTableScoreBreakdown(tableIndex: number) {
  selectedTableIndex.value = tableIndex
  showTableScoreBreakdown.value = true
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('tournament.single.tablePreview.title')"
    :description="t('tournament.single.tablePreview.description')"
    :dismissible="dismissible"
    :ui="{ content: modalMaxWidth, footer: 'justify-end gap-1.5' }"
  >
    <template #body>
      <div class="space-y-3">
        <TournamentsSinglePairingTablePreviewToolbar
          :total-score="scoreDetails.totalScore"
          :loading="loading"
          @open-settings="showSettings = true"
          @optimize="optimizeNow"
          @random="randomizeNow"
        />

        <TournamentsSinglePairingTablePreviewGrid
          :tables="localTables"
          :is-dragging="isDragging"
          :get-table-card-class="tableCardClass"
          :get-table-status="tableStatus"
          :get-table-score="tableScoreForIndex"
          @update-seats="updateTableSeats"
          @drag-start="handleDragStart"
          @drag-end="handleDragEnd"
          @open-breakdown="openTableScoreBreakdown"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between gap-2 w-full">
        <span v-if="!isValid" class="text-sm text-error">{{ previewError }}</span>
        <div class="flex gap-2 justify-end ms-auto">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="outline"
            @click="handleCancel"
          />
          <UButton
            :label="t('common.confirm')"
            :loading="loading"
            :disabled="!isValid"
            @click="handleConfirm"
          />
        </div>
      </div>
    </template>
  </UModal>

  <TournamentsSinglePairingSettingsModal
    v-model:open="showSettings"
    v-model:pair-player-a="pairPlayerA"
    v-model:pair-player-b="pairPlayerB"
    :selected-preset="selectedPreset"
    :score-items="scoreItems"
    :forbidden-pairs="forbiddenPairs"
    :all-players="players"
    @select-preset="applyWeightPreset"
    @update-weight="updateWeight"
    @add-pair="addForbiddenPairFromSelectors"
    @resolve-conflicts="autoResolveConflicts"
    @remove-pair="removeForbiddenPairFromModal"
  />

  <TournamentsSinglePairingTableScoreBreakdownModal
    v-model:open="showTableScoreBreakdown"
    :selected-table-score="selectedTableScore"
    :selected-table-player-rows="selectedTablePlayerRows"
  />
</template>
