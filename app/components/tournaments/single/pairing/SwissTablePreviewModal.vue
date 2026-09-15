<!-- app\components\tournaments\single\pairing\SwissTablePreviewModal.vue -->
<!--
  1v1 table-pairing preview for Swiss-format tournaments (Draft after its
  pod stage, Pauper/Premodern/Oldschool/Sealed/Cubo Vintage) — Phase 1 of
  docs/plans/2026-09-15-swiss-pairing-draft-1v1-plan.md.

  Deliberately the simple shuffle/drag-reorder shape (same as
  PodsManager.vue), not Commander's own weighted drag-and-drop optimizer
  (TablePreviewModal.vue) — there's no scoring/standings to optimize
  against yet for this format (phase 3 of the plan). The organizer
  reorders players by hand; confirming slices the final order into
  sequential pairs (useSwissPairing's buildPreviewPairs).
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
const orderedPlayers = ref<TablePlayer[]>([])

function shuffle() {
  orderedPlayers.value = [...players].sort(() => Math.random() - 0.5)
}

watch(() => players, shuffle, { immediate: true })

const canPlay = computed(() => calculatePairing(players.length).canPlay)
const pairs = computed<TablePlayer[][]>(() => {
  const playerByValue = new Map(orderedPlayers.value.map(player => [player.value, player]))
  return buildPreviewPairs(orderedPlayers.value.map(player => player.value))
    .map(ids => ids.map(id => playerByValue.get(id)).filter((p): p is TablePlayer => p !== null))
})

function confirm() {
  emit('confirm', orderedPlayers.value.map(player => player.value))
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('tournament.single.swissTablePreview.title')"
    :description="t('tournament.single.swissTablePreview.description')"
    :ui="{ content: 'max-w-3xl' }"
  >
    <template #body>
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-highlighted">
            {{ canPlay
              ? t('tournament.single.swissTablePreview.summary', { count: pairs.length })
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

        <VueDraggable
          v-model="orderedPlayers"
          tag="div"
          class="flex flex-col gap-2"
          handle=".drag-handle"
          :animation="180"
        >
          <div
            v-for="(player, index) in orderedPlayers"
            :key="player.value"
            class="flex items-center gap-1.5 rounded-md border border-default bg-default px-2 py-1.5"
          >
            <UIcon
              :name="ICONS.dragHandle"
              class="drag-handle size-4 text-muted cursor-grab active:cursor-grabbing"
            />
            <UBadge
              :label="t('tournament.single.swissTablePreview.tableNumber', {
                n: Math.floor(index / 2) + 1
              })"
              color="neutral"
              variant="subtle"
            />
            <span class="text-sm flex-1 truncate">{{ player.label }}</span>
          </div>
        </VueDraggable>
      </div>
    </template>

    <template #footer>
      <UButton
        :label="t('common.confirm')"
        :loading="loading"
        :disabled="!canPlay"
        @click="confirm"
      />
    </template>
  </UModal>
</template>
