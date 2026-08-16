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

function saveName(id: number, name: string) {
  updateFormat.mutateAsync({ id, edits: { name } }).catch((err) => {
    toast.add({
      title: t('mtgFormat.manageModal.errorToastTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  })
}

// Sends the current name back unchanged alongside the new color — the BFF
// endpoint updates both columns together (see [id]/update.post.ts), and this
// row's `name` is always known client-side already. Uppercased here (not
// just via the input's CSS `uppercase` class, which is display-only) so
// what's stored/compared always matches UColorPicker's own ColorTranslator
// output, whether the value came from dragging the picker or typing a
// lowercase hex into the input.
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

// UColorPicker emits update:model-value on every throttled drag tick (every
// ~50ms while dragging, per its own `throttle` prop) — v-model'ing it
// straight to a mutation fired a request per tick, a burst of concurrent
// writes to the same row that was surfacing as a wave of 500s. Staged in a
// local draft instead and only persisted once, when the popover closes.
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

// Closes the modal immediately and defers the actual delete behind a
// 10-second undo window (useUndoableAction.ts), same convention as
// useWantedCardsRowActions.ts's confirmDelete — "loading" no longer applies
// here, there is nothing to wait for at confirm time.
function onConfirmDelete() {
  if (!deletingFormat.value) return
  const format = deletingFormat.value
  confirmDeleteOpen.value = false
  deletingFormat.value = null

  undoable.run({
    title: t('mtgFormat.manageModal.deleteUndoToast', { name: format.name }),
    commit: async () => {
      try {
        await deleteFormat.mutateAsync(format.id)
      } catch (err) {
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
          v-for="format in formats"
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
    :warning="$t('common.confirmDeleteWarning')"
    :confirm-label="$t('common.delete')"
    :confirm-icon="ICONS.delete"
    @confirm="onConfirmDelete"
  />
</template>
