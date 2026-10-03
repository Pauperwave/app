<!-- app\components\tournaments\single\PodsManager.vue -->
<!-- Draft-only pod-formation modal, opened by tournaments/[tournamentId]/index.vue's "Avvia
     torneo" when the format is Draft. Deliberately just a modal with no inline trigger (table
     formation has no dedicated stepper step, so there is nowhere in the page body to host a
     "Formazione tavoli" button/summary), like TablePreviewModal.vue/
     SwissTablePreviewModal.vue. Pod sizing comes from useDraftPods.ts (ideal 8, min 6); editing
     is drag-and-drop chips.  Commander's pod-formation step uses the ported league flow instead
     (TablePreviewModal.vue and friends, under components/tournaments/single/pairing/); this
     component stays Draft-only, a preview-only toy with no persistence. -->
<script lang="ts" setup>
import { VueDraggable } from 'vue-draggable-plus'
import { randomShuffleSeed, seededShuffle } from '#shared/utils/seededShuffle'
import type { AcceptancePickerItem } from '~/components/tournaments/single/AcceptancePicker.vue'

const { players } = defineProps<{
  players: AcceptancePickerItem[]
}>()

const emit = defineEmits<{
  // Fired when the organizer confirms the pod arrangement. Draft's pods still aren't persisted (see
  // the top-of-file comment): this only signals the parent to start the tournament ("Avvia torneo"
  // goes straight to this preview for every format with a pods step, like league's "preview then
  // start")
  confirm: []
}>()

const { t } = useI18n()
const { calculatePods, buildPreviewPods } = useDraftPods()

const open = defineModel<boolean>('open', { default: false })
const podAssignments = ref<AcceptancePickerItem[][]>([])

// Re-rolls the whole pod split from scratch with no memory of prior manual drags, like the legacy
// app's "Mescola Pod" (functional spec §3.2). The seed of the current random split is shown so the
// same pods can be rebuilt later
const shuffleSeed = ref<number | null>(null)

function shufflePodsWithSeed(seed: number) {
  shuffleSeed.value = seed
  const shuffledIds = seededShuffle(players.map(player => player.value), seed)
  podAssignments.value = buildPreviewPods(shuffledIds)
    .map(ids => ids.flatMap(id => players.find(player => player.value === id) ?? []))
}

function shufflePods() {
  shufflePodsWithSeed(randomShuffleSeed())
}

// Re-shuffles whenever the accepted-player count changes — count is what
// useDraftPods actually cares about, not which specific players.
watch(() => players.length, shufflePods, { immediate: true })

const canPlay = computed(() => calculatePods(players.length).canPlay)

function confirm() {
  emit('confirm')
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('tournament.single.podsManager.modalTitle')"
    :description="t('tournament.single.podsManager.modalDescription')"
    :ui="{ content: 'max-w-6xl' }"
  >
    <template #body>
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-end gap-2">
          <TournamentsSinglePairingShuffleSeedField
            :seed="shuffleSeed"
          />
          <TournamentsSinglePairingApplySeedPopover @apply="shufflePodsWithSeed" />
          <UButton
            :label="t('tournament.single.podsManager.shuffle')"
            :icon="ICONS.shuffle"
            color="neutral"
            variant="outline"
            @click="shufflePods"
          />
        </div>

        <div class="grid gap-3 grid-cols-1 lg:grid-cols-2">
          <UCard v-for="(pod, podIndex) in podAssignments" :key="podIndex">
            <template #header>
              <div class="flex items-center justify-between">
                <span class="font-medium">
                  {{ t('tournament.single.podsManager.podTitle', { n: podIndex + 1 }) }}
                </span>
                <UBadge
                  :label="pod.length"
                  color="neutral"
                  variant="subtle"
                />
              </div>
            </template>

            <VueDraggable
              :model-value="pod"
              tag="div"
              class="flex flex-col gap-2 min-h-10"
              :group="{ name: 'pods', pull: true, put: true }"
              handle=".drag-handle"
              :animation="180"
              ghost-class="!opacity-0"
              chosen-class="scale-95"
              @update:model-value="
                (value: AcceptancePickerItem[]) => podAssignments[podIndex] = value
              "
            >
              <div
                v-for="player in pod"
                :key="player.value"
                class="flex items-center gap-1.5 rounded-md border border-default bg-default px-2 py-1.5"
              >
                <UIcon
                  :name="ICONS.dragHandle"
                  class="drag-handle size-4 text-muted cursor-grab active:cursor-grabbing"
                />
                <span class="text-sm flex-1 truncate">{{ player.label }}</span>
              </div>
            </VueDraggable>
          </UCard>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        :label="t('common.confirm')"
        :disabled="!canPlay"
        @click="confirm"
      />
    </template>
  </UModal>
</template>
