<!-- app\components\ui\ConfirmModal.vue -->
<!--
  Generalized confirmation modal — ported from MagicTheGathering/league's
  ui/modal/ConfirmModal.vue (2026-08-12), simplified to what Pauperwave's
  existing confirm dialogs actually needed: no `useButtonLogging` (analytics
  composable that doesn't exist in this app) and no separate CancelButton/
  ConfirmButton sub-components (only used here, own inline UButtons instead).
  Replaces the ad-hoc "UModal + own footer buttons" block that was starting to
  get copy-pasted (wanted-cards/index.vue's single-card delete confirm, and the
  new bulk status/delete confirm) — one place to keep the look consistent.

  Graphical style matches the original ad-hoc confirm modals (2026-08-12 user
  feedback): no title icon; `description`/`warning` flow into UModal's own
  native `:description` (plain muted text under the title). The default slot
  is separate from that — it's for content *contextual to the specific
  item(s)* being acted on (e.g. the card's thumbnail + name for a delete
  confirm), not just more text, and only renders a `#body` region at all when
  a caller actually passes it.
-->
<script setup lang="ts">
const {
  title,
  description,
  warning,
  confirmLabel,
  cancelLabel,
  confirmIcon,
  cancelIcon = ICONS.undo,
  confirmColor = 'error',
  loading = false,
  dismissible = true,
  confirmDisabled = false
} = defineProps<{
  title: string
  /** Shown under the title, e.g. a one-line summary of the action. */
  description?: string
  /** Extra line appended to the description, e.g. "this can't be undone". */
  warning?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Trailing icon on the confirm button — none by default, e.g. pass ICONS.delete for a delete confirm. */
  confirmIcon?: string
  cancelIcon?: string
  /** Most confirmations are destructive (delete) hence the 'error' default —
   * override to 'warning'/'primary' for a heavier-but-non-destructive action
   * that still deserves a confirm step. */
  confirmColor?: 'error' | 'warning' | 'primary'
  loading?: boolean
  dismissible?: boolean
  /** For confirms that need extra required input in the #body slot (e.g. a
   *  "who received this" select) before confirming makes sense — disables the
   *  confirm button without blocking the whole modal. */
  confirmDisabled?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const open = defineModel<boolean>('open', { required: true })

const { t } = useI18n()

const displayConfirmLabel = computed(() => confirmLabel ?? t('common.confirm'))
const displayCancelLabel = computed(() => cancelLabel ?? t('common.cancel'))
const displayDescription = computed(() => [description, warning].filter(Boolean).join(' '))

function onCancel() {
  open.value = false
  emit('cancel')
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="displayDescription || undefined"
    :dismissible="dismissible && !loading"
    :ui="{ footer: 'justify-end p-3 sm:px-3 gap-2' }"
  >
    <template v-if="$slots.default" #body>
      <slot />
    </template>

    <template #footer>
      <UButton
        color="neutral"
        variant="subtle"
        :trailing-icon="cancelIcon"
        :disabled="loading"
        :label="displayCancelLabel"
        @click="onCancel"
      />
      <UButton
        :color="confirmColor"
        variant="solid"
        :trailing-icon="confirmIcon"
        :loading="loading"
        :disabled="confirmDisabled"
        :label="displayConfirmLabel"
        @click="emit('confirm')"
      />
    </template>
  </UModal>
</template>
