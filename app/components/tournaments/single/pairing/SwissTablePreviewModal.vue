<!-- app\components\tournaments\single\pairing\SwissTablePreviewModal.vue -->
<!-- 1v1 table-pairing preview for Swiss-format tournaments (Draft after its pod stage,
     Pauper/Premodern/Oldschool/ Sealed/Cubo Vintage), phase 1 of
     docs/plans/2026-09-15-swiss-pairing-draft-1v1-plan.md.  Same visual/interaction shape as
     Commander's TablePreviewModal.vue (a grid of UCards, each a cross-table VueDraggable group
     like TableCard.vue/TableSeatItem.vue, with people as AssociateTag), but not its weighted
     drag-and-drop optimizer (no scoring/standings to optimize against yet for this format,
     phase 3 of the plan): free cross-table dragging plus a check that every table still has
     exactly 2 players (or, with an odd count, one lone player: the bye). -->
<script lang="ts" setup>
import { VueDraggable } from 'vue-draggable-plus'
import { randomShuffleSeed, seededShuffle } from '#shared/utils/seededShuffle'
import type { TablePlayer } from '~/types'
import { seatingMatchesPlayers, type ConfirmedSeating } from '~/composables/tournaments/rounds/useConfirmedSeatings'

const {
  players,
  loading = false,
  currentRound = 1,
  confirmedSeating = null
} = defineProps<{
  players: TablePlayer[]
  loading?: boolean
  currentRound?: number
  // Tables approved for this round before a turn-back deleted it: reopened as-is (with round 1's
  // seed).
  confirmedSeating?: ConfirmedSeating | null
}>()

const emit = defineEmits<{
  confirm: [associateOrder: string[], shuffleSeed: number | null]
}>()

const { t } = useI18n()
const { calculatePairing, buildPreviewPairs } = useSwissPairing()

const open = defineModel<boolean>('open', { default: false })
const tables = ref<TablePlayer[][]>([])

function buildTables(playerList: TablePlayer[]): TablePlayer[][] {
  const playerByValue = new Map(playerList.map(player => [player.value, player]))
  return buildPreviewPairs(playerList.map(player => player.value))
    .map(ids => ids.map(id => playerByValue.get(id)).filter((p): p is TablePlayer => p !== null))
}

// The seed of the current random seating — shown so the same tables can be rebuilt later.
const shuffleSeed = ref<number | null>(null)

// Builds the tables from the given order by default: for round 2+ that is already the
// standings-based pairing (1st vs 2nd, 3rd vs 4th, ...) from swissPairing.ts's pairSwissRound,
// which an unconditional shuffle silently discarded every time the modal opened (pairings looked
// random even after round 1). Random seating is one click away via the "Shuffle" button, e.g. for
// round 1's registration-order starting point
function resetTables() {
  shuffleSeed.value = null
  tables.value = buildTables(players)
}

function shuffleWithSeed(seed: number) {
  shuffleSeed.value = seed
  const playerByValue = new Map(players.map(player => [player.value, player]))
  const shuffledPlayers = seededShuffle([...playerByValue.keys()], seed)
    .flatMap(value => playerByValue.get(value) ?? [])
  tables.value = buildTables(shuffledPlayers)
}

function shuffle() {
  shuffleWithSeed(randomShuffleSeed())
}

function restoreSeating(seating: ConfirmedSeating) {
  const playerByValue = new Map(players.map(player => [player.value, player]))
  shuffleSeed.value = seating.seed
  tables.value = seating.tables.map(ids => ids.flatMap(id => playerByValue.get(id) ?? []))
}

// Approved tables first (after a turn-back), else round 1 opens on a random seeded shuffle like
// Commander and round 2+ on the standings-based pairing
function initTables() {
  const playerIds = players.map(player => player.value)
  if (confirmedSeating && seatingMatchesPlayers(confirmedSeating, playerIds)) {
    restoreSeating(confirmedSeating)
  } else if (currentRound === 1) {
    shuffle()
  } else {
    resetTables()
  }
}

// Watches length, not the array reference (like PodsManager.vue's shufflePods watcher): the
// parent's players prop is a fresh computed array on every re-render (e.g. a refetch after a failed
// advance), so watching the reference would silently rebuild the organizer's already-arranged
// tables
watch(() => players.length, initTables, { immediate: true })
watch(open, (isOpen) => {
  if (isOpen) initTables()
})

const pairingSplit = computed(() => calculatePairing(players.length))
const canPlay = computed(() => pairingSplit.value.canPlay)
// Cross-table dragging can leave a table with the wrong seat count: every table must land back on
// exactly 2 before confirming (except the single bye of an odd count), the same "every table valid"
// gate as Commander's TablePreviewModal.vue (isValid/previewError), reusing its error copy
const byeTableCount = computed(() => tables.value.filter(table => table.length === 1).length)
const isValid = computed(() =>
  tables.value.length > 0
  && tables.value.every(table => table.length === 1 || table.length === 2)
  && byeTableCount.value === (pairingSplit.value.hasBye ? 1 : 0))

function updateTable(tableIndex: number, value: TablePlayer[]) {
  tables.value[tableIndex] = value
}

// The bye (lone player) always goes last: the RPC seats the odd one out at the end.
function confirm() {
  const pairedTables = tables.value.filter(table => table.length === 2)
  const byeTables = tables.value.filter(table => table.length === 1)
  emit('confirm', [...pairedTables, ...byeTables].flat().map(player => player.value), shuffleSeed.value)
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('tournament.single.swissTablePreview.title')"
    :description="t('tournament.single.swissTablePreview.description')"
    :ui="{ content: tables.length <= 1 ? 'max-w-3xl' : 'max-w-5xl' }"
  >
    <template #body>
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-highlighted">
            {{ canPlay
              ? t('tournament.single.swissTablePreview.summary', { count: tables.length })
              : t('tournament.single.swissTablePreview.invalidCount') }}
          </span>
          <!-- Shuffle/seed on round 1 only: later pairs follow the standings (ADR-043). -->
          <div v-if="currentRound === 1" class="flex items-center gap-2">
            <TournamentsSinglePairingShuffleSeedField
              :seed="shuffleSeed"
            />
            <TournamentsSinglePairingApplySeedPopover @apply="shuffleWithSeed" />
            <UButton
              :label="t('tournament.single.podsManager.shuffle')"
              :icon="ICONS.shuffle"
              color="neutral"
              variant="outline"
              @click="shuffle"
            />
          </div>
        </div>

        <!-- Round 2+: the pairing algorithm spelled out (ADR-043), so the organizer knows why. -->
        <p v-if="currentRound > 1" class="flex items-start gap-1.5 text-sm text-muted">
          <UIcon :name="ICONS.info" class="mt-0.5 size-4 shrink-0" />
          <span>{{ t('tournament.single.swissTablePreview.standingsBased') }}</span>
        </p>

        <div :class="['grid gap-3', tables.length <= 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2']">
          <UCard
            v-for="(table, tableIndex) in tables"
            :key="tableIndex"
            :ui="{ header: 'px-2 py-1.5 sm:px-2 sm:py-1.5', body: 'px-2 py-2 sm:px-2 sm:py-2' }"
          >
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon :name="ICONS.tableView" class="size-4 text-primary" />
                <span class="font-semibold text-base">
                  {{ table.length === 1
                    ? t('tournament.single.roundManager.byeTitle')
                    : t('tournament.single.swissTablePreview.tableNumber', { n: tableIndex + 1 }) }}
                </span>
              </div>
            </template>

            <VueDraggable
              :model-value="table"
              tag="div"
              class="flex flex-col gap-2"
              :group="{ name: 'swiss-seats', pull: true, put: true }"
              handle=".drag-handle"
              :animation="180"
              ghost-class="!opacity-0"
              chosen-class="scale-95"
              @update:model-value="(value: TablePlayer[]) => updateTable(tableIndex, value)"
            >
              <div
                v-for="player in table"
                :key="player.value"
                class="rounded-md border border-default bg-default flex items-center gap-1.5 px-1.5 py-1"
              >
                <button
                  type="button"
                  class="drag-handle text-muted hover:text-default transition cursor-grab active:cursor-grabbing"
                  :aria-label="t('tournament.single.tablePreview.dragPlayerAriaLabel')"
                >
                  <UIcon :name="ICONS.dragHandle" class="size-4" />
                </button>

                <div class="flex min-w-0 flex-1 flex-col">
                  <AssociateTag
                    :name="player.label"
                    :associate-uuid="player.value"
                    size="md"
                    class="text-left"
                  />
                  <TournamentsSinglePairingTablePlayerStandingLine
                    v-if="player.standing"
                    :standing="player.standing"
                  />
                </div>
              </div>
            </VueDraggable>
          </UCard>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between gap-2 w-full">
        <span v-if="!isValid" class="text-sm text-error">
          {{ t('tournament.single.swissTablePreview.invalidTables') }}
        </span>
        <div class="flex gap-2 justify-end ms-auto">
          <UButton
            :label="t('common.cancel')"
            :trailing-icon="ICONS.undo"
            color="neutral"
            variant="outline"
            @click="open = false"
          />
          <UButton
            :label="t('common.confirm')"
            :trailing-icon="ICONS.confirm"
            :loading="loading"
            :disabled="!isValid"
            @click="confirm"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
