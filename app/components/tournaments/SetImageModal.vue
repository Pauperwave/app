<!-- app\components\tournaments\SetImageModal.vue -->
<!--
  "Imposta immagine" modal — same MagicCardArtPicker + own confirm step
  shape used by BulkActionsBar.vue's bulk action and Cover.vue's
  single-tournament quick action (user request, 2026-09-02: shared instead
  of duplicated). Only owns the picker UI and the picked-value state; the
  actual mutation (bulk vs. single differ in what happens on confirm) stays
  with each caller — this only emits what was picked. Doesn't auto-close on
  confirm either, so a caller that awaits its own mutation can show
  `loading` and only close once it actually succeeds.
-->
<script setup lang="ts">
const { open, title, loading = false } = defineProps<{
  open: boolean
  title: string
  /** @default false — set while the caller's own mutation is in flight. */
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': [imageUrl: string, cardName: string | null, artist: string | null]
}>()

const { t } = useI18n()

const pickedImage = ref<string | undefined>(undefined)
const pickedImageCardName = ref<string | undefined>(undefined)
const pickedImageCardArtist = ref<string | undefined>(undefined)

// Resets whenever the modal closes, regardless of why (cancelled, or the
// caller closed it after a successful confirm) — one reset path instead of
// each caller having to remember to clear picked state itself.
watch(() => open, (isOpen) => {
  if (isOpen) return
  pickedImage.value = undefined
  pickedImageCardName.value = undefined
  pickedImageCardArtist.value = undefined
})

function confirm() {
  if (!pickedImage.value) return
  emit('confirm', pickedImage.value, pickedImageCardName.value ?? null, pickedImageCardArtist.value ?? null)
}
</script>

<template>
  <UModal
    :open="open"
    :title="title"
    :ui="{ content: 'max-w-md' }"
    @update:open="$emit('update:open', $event)"
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
            @click="$emit('update:open', false)"
          />
          <UButton
            :label="t('tournament.bulkActions.confirm')"
            :disabled="!pickedImage"
            :loading="loading"
            @click="confirm"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
