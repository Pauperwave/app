<!-- app\components\tournaments\single\PodsManager.vue -->
<!--
  Draft-only pod-formation step (user request, 2026-08-24) — sits between
  AcceptancePicker and round 1 in tournaments/[tournamentId]/index.vue's
  stepper, only when the tournament's format is Draft. Pod sizing comes from
  useDraftPods.ts (ideal 8, min 6), already built/tested. Editing happens in a
  modal with drag-and-drop chips.

  Commander's own pod-formation step (2026-09-15) uses the ported
  MagicTheGathering/league flow instead (TablePreviewModal.vue and friends,
  under components/tournaments/single/pairing/) — this component stays
  Draft-only, a preview-only toy with no persistence, unaffected by that.
-->
<script lang="ts" setup>
import { VueDraggable } from 'vue-draggable-plus'
import type { AcceptancePickerItem } from '~/components/tournaments/single/AcceptancePicker.vue'

const { players } = defineProps<{
  players: AcceptancePickerItem[]
}>()

const emit = defineEmits<{
  // Fired when the organizer confirms the pod arrangement — Draft's own
  // pods still aren't persisted anywhere (out of scope, see the top-of-file
  // comment), this is only a signal for the parent to actually start the
  // tournament (user request, 2026-09-17: "Avvia torneo" should skip
  // straight to this preview for every format that has a pods step, not
  // just Commander, matching league's own "preview then start" UX).
  confirm: []
}>()

const { t } = useI18n()
const { calculatePods, buildPreviewPods } = useDraftPods()

const open = defineModel<boolean>('open', { default: false })
const podAssignments = ref<AcceptancePickerItem[][]>([])

// Re-rolls the whole pod split from scratch — no memory of prior manual
// drags, same "shuffle fully re-randomizes" behavior as the legacy app's own
// "Mescola Pod" (functional spec §3.2).
function shufflePods() {
  const shuffledIds = [...players]
    .map(player => player.value)
    .sort(() => Math.random() - 0.5)
  podAssignments.value = buildPreviewPods(shuffledIds)
    .map(ids => ids.map(id => players.find(player => player.value === id)!))
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
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-highlighted">
        {{ canPlay
          ? t('tournament.single.podsManager.summary', { count: podAssignments.length })
          : t('tournament.single.podsManager.invalidCount') }}
      </span>
      <UButton
        :label="t('tournament.single.podsManager.open')"
        :icon="ICONS.layers"
        :disabled="!canPlay"
        @click="open = true"
      />
    </div>

    <UModal
      v-model:open="open"
      :title="t('tournament.single.podsManager.modalTitle')"
      :description="t('tournament.single.podsManager.modalDescription')"
      :ui="{ content: 'max-w-6xl' }"
    >
      <template #body>
        <div class="flex flex-col gap-3">
          <div class="flex justify-end">
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
        <UButton :label="t('common.confirm')" @click="confirm" />
      </template>
    </UModal>
  </div>
</template>
