<!-- app\components\mtgFormats\ManageModal.vue -->
<!-- Lightweight by design: mtg_formats will only hold a handful of rows (Commander, Premodern,
     Pauper, Draft, ...), so this is a modal reachable from the tournaments toolbar, not a full
     /formats page+route like /locations. Each row saves inline on blur, with no separate
     Add/Edit sub-modals. No description field: mtg_formats.description exists in the schema but
     nothing in the app renders it. -->
<script setup lang="ts">
const open = defineModel<boolean>({ default: false })

// Passed in by the caller (tournaments/index.vue has every tournament's formatUuid loaded) rather
// than queried here: lets the delete button be disabled up front (showing how many tournaments use
// it) instead of failing on fk_tournaments_format_uuid_fkey
const { formatUsageCounts } = defineProps<{ formatUsageCounts: Map<string, number> }>()

const { t } = useI18n()
const toast = useToast()
const undoable = useUndoableAction()
const { data: formats } = useMtgFormatsQuery()
const { createFormat, updateFormat, deleteFormat } = useMtgFormatsMutations()

function usageCount(uuid: string) {
  return formatUsageCounts.get(uuid) ?? 0
}

// Same neutral-500 shade as the legacy fallback in useFormatColor.ts — shown
// (and saved on first pick) instead of an unset/placeholder state, so the
// swatch button always has a real color to display.
const DEFAULT_FORMAT_COLOR = '#71717A'

const newName = ref('')

const deletingFormat = ref<{ id: number, name: string } | null>(null)
const confirmDeleteOpen = ref(false)

// Optimistic, UI-only: filters a format out of the list the instant its delete is confirmed, before
// the real mutation (deferred behind the undo window) runs. Restored by removing the id again if
// undone
const pendingDeleteIds = ref(new Set<number>())
const visibleFormats = computed(() =>
  (formats.value ?? []).filter(format => !pendingDeleteIds.value.has(format.id)))

function saveName(id: number, name: string) {
  updateFormat.mutateAsync({ id, edits: { name } }).catch((err) => {
    toast.add({
      title: t('mtgFormat.manageModal.errorToastTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  })
}

// Sends the current name back unchanged alongside the new color: the BFF endpoint updates both
// columns together (see [id]/update.post.ts) and the row's `name` is known client-side. Uppercased
// here (not just via the input's display-only `uppercase` class) so what is stored/compared matches
// UColorPicker's ColorTranslator output, whether the value came from dragging the picker or typing
// a lowercase hex
function saveColor(id: number, name: string, color: string | undefined) {
  const edits = { name, color: color?.toUpperCase() ?? null }
  updateFormat.mutateAsync({ id, edits }).catch((err) => {
    toast.add({
      title: t('mtgFormat.manageModal.errorToastTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  })
}

// UColorPicker emits update:model-value on every throttled drag tick (~50ms, per its `throttle`
// prop): v-model'ing it to a mutation fired a request per tick, a burst of concurrent writes to one
// row surfacing as a wave of 500s. Staged in a local draft and persisted once, when the popover
// closes
const draftColors = reactive<Record<number, string>>({})

function onColorPopoverOpenChange(
  isOpen: boolean,
  format: { id: number, name: string, color: string | null }
) {
  if (isOpen) {
    draftColors[format.id] = format.color ?? DEFAULT_FORMAT_COLOR
    return
  }
  const draft = draftColors[format.id]
  const current = (format.color ?? DEFAULT_FORMAT_COLOR).toUpperCase()
  if (draft !== undefined && draft.toUpperCase() !== current) {
    saveColor(format.id, format.name, draft)
  }
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

function askDelete(id: number, name: string) {
  deletingFormat.value = { id, name }
  confirmDeleteOpen.value = true
}

// Closes the modal at once and defers the delete behind a 10-second undo window
// (useUndoableAction.ts), like useWantedCardsRowActions.ts's confirmDelete: nothing to wait for at
// confirm time
function onConfirmDelete() {
  if (!deletingFormat.value) return
  const format = deletingFormat.value
  confirmDeleteOpen.value = false
  deletingFormat.value = null

  undoable.run({
    title: t('mtgFormat.manageModal.deleteUndoToast', { name: format.name }),
    onApply: () => pendingDeleteIds.value.add(format.id),
    onRevert: () => pendingDeleteIds.value.delete(format.id),
    commit: async () => {
      try {
        await deleteFormat.mutateAsync(format.id)
      } catch (err) {
        // The optimistic hide only reverts on undo — a failed real delete
        // needs its own cleanup so the row doesn't stay hidden forever.
        pendingDeleteIds.value.delete(format.id)
        toast.add({
          title: t('mtgFormat.manageModal.deleteErrorToastTitle'),
          description: toErrorMessage(err),
          color: 'error'
        })
      }
    }
  })
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
          v-for="format in visibleFormats"
          :key="format.id"
          class="flex items-center gap-2"
        >
          <UPopover @update:open="(isOpen) => onColorPopoverOpenChange(isOpen, format)">
            <UButton
              :label="(format.color ?? DEFAULT_FORMAT_COLOR).toUpperCase()"
              color="neutral"
              variant="outline"
              class="shrink-0"
              :ui="{ label: 'w-[7ch] font-mono tabular-nums' }"
              :aria-label="$t('mtgFormat.manageModal.color')"
            >
              <template #leading>
                <span
                  :style="{ backgroundColor: format.color ?? DEFAULT_FORMAT_COLOR }"
                  class="size-3 rounded-full"
                />
              </template>
            </UButton>

            <template #content>
              <div class="p-3 space-y-3">
                <UInput
                  v-model="draftColors[format.id]"
                  class="font-mono uppercase"
                  :placeholder="DEFAULT_FORMAT_COLOR"
                />
                <UColorPicker v-model="draftColors[format.id]" />
              </div>
            </template>
          </UPopover>

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
            @click="askDelete(format.id, format.name)"
          />
        </div>

        <div v-if="!visibleFormats.length" class="text-center py-6 text-muted text-sm">
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
    :warning="$t('common.confirmDeleteWarning')"
    :confirm-label="$t('common.delete')"
    :confirm-icon="ICONS.delete"
    @confirm="onConfirmDelete"
  />
</template>
