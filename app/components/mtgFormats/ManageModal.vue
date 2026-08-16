<!-- app\components\mtgFormats\ManageModal.vue -->
<!--
  Lightweight by design (2026-08-16 user request) — mtg_formats will only
  ever hold a handful of rows (Commander, Premodern, Pauper, Draft, ...), so
  this is a modal reachable from the tournaments toolbar, not a full
  /formats page+route like /locations got. Each row saves inline on blur;
  no separate Add/Edit sub-modals. No description field: mtg_formats.description
  exists in the schema but nothing in the app renders it (2026-08-16).
-->
<script setup lang="ts">
const open = defineModel<boolean>({ default: false })

// Passed in by the caller (tournaments/index.vue already has every
// tournament's formatUuid loaded) rather than queried here — lets the delete
// button be disabled up front (and show how many tournaments use it) instead
// of only failing after the fact on the fk_tournaments_format_uuid_fkey
// constraint.
const { formatUsageCounts } = defineProps<{ formatUsageCounts: Map<string, number> }>()

const { t } = useI18n()
const toast = useToast()
const { data: formats } = useMtgFormatsQuery()
const { createFormat, updateFormat, deleteFormat } = useMtgFormatsMutations()

function usageCount(uuid: string) {
  return formatUsageCounts.get(uuid) ?? 0
}

const newName = ref('')

const deletingId = ref<number | null>(null)
const confirmDeleteOpen = ref(false)

function saveName(id: number, name: string) {
  updateFormat.mutateAsync({ id, edits: { name } }).catch((err) => {
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
    await createFormat.mutateAsync({ name: newName.value.trim() })
    newName.value = ''
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
          class="flex items-center gap-2"
        >
          <UInput
            :model-value="format.name"
            class="flex-1"
            @blur="($event) => {
              const value = ($event.target as HTMLInputElement).value
              if (value && value !== format.name) saveName(format.id, value)
            }"
          />

          <UBadge
            v-if="usageCount(format.uuid)"
            color="neutral"
            variant="subtle"
            :icon="ICONS.standings"
          >
            {{ t('mtgFormat.manageModal.usageCount', usageCount(format.uuid)) }}
          </UBadge>

          <UTooltip
            v-if="usageCount(format.uuid)"
            :text="t('mtgFormat.manageModal.deleteDisabledInUse', usageCount(format.uuid))"
          >
            <UButton
              :icon="ICONS.delete"
              color="error"
              variant="ghost"
              size="sm"
              disabled
              :aria-label="$t('mtgFormat.manageModal.delete')"
            />
          </UTooltip>
          <UButton
            v-else
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

        <div class="flex items-center gap-2 pt-3 border-t border-default">
          <UInput
            v-model="newName"
            class="flex-1"
            :placeholder="$t('mtgFormat.manageModal.namePlaceholder')"
            @keydown.enter="onAdd"
          />

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
