<!-- app\components\tournaments\single\pairing\SwissTablePreviewModal.vue -->
<!--
  1v1 table-pairing preview for Swiss-format tournaments (Draft after its
  pod stage, Pauper/Premodern/Oldschool/Sealed/Cubo Vintage) — Phase 1 of
  docs/plans/2026-09-15-swiss-pairing-draft-1v1-plan.md.

  Same visual/interaction shape as Commander's own TablePreviewModal.vue
  (user request, 2026-09-16: "deve somigliare alla vista del commander,
  table che è un UCard e le persone rappresentate da AssociateTag") — a
  grid of UCards, each a cross-table VueDraggable group (like TableCard.vue/
  TableSeatItem.vue), not Commander's own weighted drag-and-drop optimizer
  (no scoring/standings to optimize against yet for this format, phase 3 of
  the plan) — just free cross-table dragging + a validity check that every
  table still has exactly 2 players (or, with an odd count, one lone player:
  the bye).
-->
<script lang="ts" setup>
import { VueDraggable } from 'vue-draggable-plus'
import type { TablePlayer } from '~/types'

const { players, loading = false } = defineProps<{
  players: TablePlayer[]
  loading?: boolean
}>()

const emit = defineEmits<{
  confirm: [associateOrder: string[]]
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

function shuffle() {
  tables.value = buildTables([...players].sort(() => Math.random() - 0.5))
}

// Watches length, not the array reference itself — same as
// PodsManager.vue's own shufflePods watcher. The parent's players prop is a
// fresh computed array on every re-render (e.g. a query refetch after a
// failed advance), so watching the reference would silently reshuffle the
// organizer's already-arranged tables underneath them.
watch(() => players.length, shuffle, { immediate: true })

const pairingSplit = computed(() => calculatePairing(players.length))
const canPlay = computed(() => pairingSplit.value.canPlay)
// Cross-table dragging (unlike the old single flat list) can leave a table
// with the wrong seat count — every table must land back on exactly 2
// before confirming (except the single bye of an odd count), same "every
// table valid" gate as Commander's own TablePreviewModal.vue
// (isValid/previewError), reusing its error copy.
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
  emit('confirm', [...pairedTables, ...byeTables].flat().map(player => player.value))
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
          <UButton
            :label="t('tournament.single.podsManager.shuffle')"
            :icon="ICONS.shuffle"
            color="neutral"
            variant="outline"
            @click="shuffle"
          />
        </div>

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

                <AssociateTag
                  :name="player.label"
                  :associate-uuid="player.value"
                  size="md"
                  class="flex-1 text-left"
                />
              </div>
            </VueDraggable>
          </UCard>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between gap-2 w-full">
        <span v-if="!isValid" class="text-sm text-error">
          {{ t('tournament.single.tablePreview.invalidTableSizes') }}
        </span>
        <UButton
          class="ms-auto"
          :label="t('common.confirm')"
          :loading="loading"
          :disabled="!isValid"
          @click="confirm"
        />
      </div>
    </template>
  </UModal>
</template>
