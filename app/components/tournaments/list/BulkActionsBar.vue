<!-- app\components\tournaments\list\BulkActionsBar.vue -->
<!--
  Shown only while at least one tournament is selected (useSelection.ts) —
  shared between the table and grid views, which both feed the same
  selection. Same shape/reasoning as WantedCardsListBulkActionsBar.vue,
  including the "swap, don't insert a row" trick — see that file's header
  comment.
-->
<script setup lang="ts">
import type { TournamentStatus } from '~/types'

const { count, side } = defineProps<{ count: number, side: 'left' | 'right' }>()

const emit = defineEmits<{
  clear: []
  markStatus: [status: TournamentStatus]
  setImage: [imageUrl: string, imageCardName: string | null, imageCardArtist: string | null]
  setEntryFee: [entryFee: number]
  delete: []
}>()

const { t } = useI18n()

const statusItems = computed(() => TOURNAMENT_STATUSES.map(status => ({
  label: t(`tournament.status.${status}`),
  icon: TOURNAMENT_STATUS_ICONS[status],
  value: status
})))

// Picking an art in MagicCardArtPicker sets `pickedImage` immediately, but
// the actual bulk mutation still needs its own confirm step (matches
// markStatus/delete, which both route through ConfirmModal in index.vue) —
// this modal's own "Applica" button is that step, not the picker itself.
const imageModalOpen = ref(false)
const pickedImage = ref<string | undefined>(undefined)
const pickedImageCardName = ref<string | undefined>(undefined)
const pickedImageCardArtist = ref<string | undefined>(undefined)

function confirmImage() {
  if (!pickedImage.value) return
  emit('setImage', pickedImage.value, pickedImageCardName.value ?? null, pickedImageCardArtist.value ?? null)
  closeImageModal()
}

function closeImageModal() {
  imageModalOpen.value = false
  pickedImage.value = undefined
  pickedImageCardName.value = undefined
  pickedImageCardArtist.value = undefined
}

// Same "own modal + explicit confirm" shape as the image action above.
const entryFeeModalOpen = ref(false)
const pickedEntryFee = ref<number | undefined>(undefined)

function confirmEntryFee() {
  if (pickedEntryFee.value === undefined) return
  emit('setEntryFee', pickedEntryFee.value)
  entryFeeModalOpen.value = false
  pickedEntryFee.value = undefined
}
</script>

<template>
  <div v-if="side === 'left'" class="flex items-center gap-3 flex-wrap">
    <span class="text-sm text-muted">
      {{ t('tournament.bulkActions.selectedCount', count) }}
    </span>

    <UButton
      :label="t('tournament.bulkActions.clearSelection')"
      color="neutral"
      variant="ghost"
      @click="$emit('clear')"
    />
  </div>

  <div v-else class="flex items-center gap-2 flex-wrap">
    <UDropdownMenu
      :items="statusItems.map(item => ({
        label: item.label,
        icon: item.icon,
        onSelect: () => $emit('markStatus', item.value)
      }))"
    >
      <UButton
        :label="t('tournament.bulkActions.markAs')"
        color="neutral"
        variant="outline"
        :trailing-icon="ICONS.chevronDown"
      />
    </UDropdownMenu>

    <UButton
      :label="t('tournament.bulkActions.setImage')"
      :icon="ICONS.image"
      color="neutral"
      variant="outline"
      @click="imageModalOpen = true"
    />

    <UButton
      :label="t('tournament.bulkActions.setEntryFee')"
      :icon="ICONS.euro"
      color="neutral"
      variant="outline"
      @click="entryFeeModalOpen = true"
    />

    <UButton
      :label="t('tournament.rowActions.delete')"
      :icon="ICONS.delete"
      color="error"
      variant="outline"
      @click="$emit('delete')"
    />
  </div>

  <UModal
    v-model:open="imageModalOpen"
    :title="t('tournament.bulkActions.setImageModalTitle', count)"
    :ui="{ content: 'max-w-md' }"
  >
    <template #body>
      <div class="space-y-4">
        <MagicCardArtPicker
          v-model="pickedImage"
          v-model:card-name="pickedImageCardName"
          v-model:artist="pickedImageCardArtist"
        />

        <div class="flex justify-end gap-2">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="ghost"
            @click="closeImageModal"
          />
          <UButton
            :label="t('tournament.bulkActions.confirm')"
            :disabled="!pickedImage"
            @click="confirmImage"
          />
        </div>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="entryFeeModalOpen"
    :title="t('tournament.bulkActions.setEntryFeeModalTitle', count)"
    :ui="{ content: 'max-w-sm' }"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField :label="$t('tournament.addModal.fields.entryFee')">
          <UInputNumber
            v-model="pickedEntryFee"
            :min="0"
            :step="5"
            class="w-full"
            :icon="ICONS.euro"
          />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="ghost"
            @click="entryFeeModalOpen = false; pickedEntryFee = undefined"
          />
          <UButton
            :label="t('tournament.bulkActions.confirm')"
            :disabled="pickedEntryFee === undefined"
            @click="confirmEntryFee"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
