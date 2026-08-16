<!-- app\components\mtgFormats\ManageModal.vue -->
<!--
  Lightweight by design (2026-08-16 user request) — mtg_formats will only
  ever hold a handful of rows (Commander, Premodern, Pauper, Draft, ...), so
  this is a modal reachable from the tournaments toolbar, not a full
  /formats page+route like /locations got. Each row saves inline on blur;
  no separate Add/Edit sub-modals.
-->
<script setup lang="ts">
import type { NewMtgFormatPayload } from '#shared/types/mtgFormats'

const open = defineModel<boolean>({ default: false })

const { t } = useI18n()
const toast = useToast()
const { data: formats } = useMtgFormatsQuery()
const { createFormat, updateFormat, deleteFormat } = useMtgFormatsMutations()

const newName = ref('')
const newDescription = ref('')

const deletingId = ref<number | null>(null)
const confirmDeleteOpen = ref(false)

function saveField(id: number, edits: NewMtgFormatPayload) {
  updateFormat.mutateAsync({ id, edits }).catch((err) => {
    toast.add({
      title: t('mtgFormat.manageModal.errorToastTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  })
}

async function onAdd() {
  if (!newName.value.trim()) return
  try {
    await createFormat.mutateAsync({
      name: newName.value.trim(),
      description: newDescription.value || null
    })
    newName.value = ''
    newDescription.value = ''
  } catch (err) {
    toast.add({
      title: t('mtgFormat.manageModal.errorToastTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  }
}

function askDelete(id: number) {
  deletingId.value = id
  confirmDeleteOpen.value = true
}

async function onConfirmDelete() {
  if (deletingId.value === null) return
  try {
    await deleteFormat.mutateAsync(deletingId.value)
  } catch (err) {
    toast.add({
      title: t('mtgFormat.manageModal.deleteErrorToastTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  } finally {
    confirmDeleteOpen.value = false
    deletingId.value = null
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'max-w-lg' }"
    :title="$t('mtgFormat.manageModal.title')"
    :description="$t('mtgFormat.manageModal.description')"
  >
    <template #body>
      <div class="space-y-3">
        <div
          v-for="format in formats"
          :key="format.id"
          class="flex items-start gap-2"
        >
          <div class="flex-1 space-y-1">
            <UInput
              :model-value="format.name"
              class="w-full"
              @blur="($event) => {
                const value = ($event.target as HTMLInputElement).value
                if (value && value !== format.name) {
                  saveField(format.id, { name: value, description: format.description })
                }
              }"
            />
            <UInput
              :model-value="format.description ?? ''"
              class="w-full"
              size="sm"
              :placeholder="$t('mtgFormat.manageModal.descriptionPlaceholder')"
              @blur="($event) => {
                const value = ($event.target as HTMLInputElement).value || null
                if (value !== format.description) {
                  saveField(format.id, { name: format.name, description: value })
                }
              }"
            />
          </div>

          <UButton
            :icon="ICONS.delete"
            color="error"
            variant="ghost"
            size="sm"
            :aria-label="$t('mtgFormat.manageModal.delete')"
            @click="askDelete(format.id)"
          />
        </div>

        <div v-if="!formats?.length" class="text-center py-6 text-muted text-sm">
          {{ $t('mtgFormat.manageModal.empty') }}
        </div>

        <div class="flex items-start gap-2 pt-3 border-t border-default">
          <div class="flex-1 space-y-1">
            <UInput
              v-model="newName"
              class="w-full"
              :placeholder="$t('mtgFormat.manageModal.namePlaceholder')"
              @keydown.enter="onAdd"
            />
            <UInput
              v-model="newDescription"
              class="w-full"
              size="sm"
              :placeholder="$t('mtgFormat.manageModal.descriptionPlaceholder')"
              @keydown.enter="onAdd"
            />
          </div>

          <UButton
            :icon="ICONS.add"
            color="primary"
            variant="soft"
            size="sm"
            :disabled="!newName.trim()"
            :loading="createFormat.isLoading.value"
            :aria-label="$t('mtgFormat.manageModal.add')"
            @click="onAdd"
          />
        </div>
      </div>
    </template>
  </UModal>

  <ConfirmModal
    v-model:open="confirmDeleteOpen"
    :title="$t('mtgFormat.manageModal.deleteConfirmTitle')"
    :description="$t('mtgFormat.manageModal.deleteConfirmDescription')"
    :confirm-label="$t('common.delete')"
    :confirm-icon="ICONS.delete"
    :loading="deleteFormat.isLoading.value"
    @confirm="onConfirmDelete"
  />
</template>
