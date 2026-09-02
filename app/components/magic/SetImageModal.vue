<!-- app\components\magic\SetImageModal.vue -->
<!--
  "Imposta immagine" modal — same MagicCardArtPicker + own confirm step
  shape used by tournaments' and events' bulk actions bars and their
  single-item Cover.vue quick actions (user request, 2026-09-02: shared
  instead of duplicated per domain — originally lived under tournaments/,
  moved here once events needed the exact same thing). Only owns the
  picker UI and the picked-value state; the actual mutation (bulk vs.
  single, and which domain's endpoint) stays with each caller — this only
  emits what was picked. Doesn't auto-close on confirm either, so a caller
  that awaits its own mutation can show `loading` and only close once it
  actually succeeds. cardName/artist are always emitted even for domains
  that have nowhere to store them (events) — the caller just ignores them.
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
            :label="t('common.confirm')"
            :disabled="!pickedImage"
            :loading="loading"
            @click="confirm"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
