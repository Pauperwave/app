<!-- app\components\tournaments\single\AcceptedToolbarRow.vue -->
<!--
  "Iscritti (Pagato)" own toolbar row — swaps between the bulk-selection bar
  (just "Rimuovi selezionati", once at least one row is selected) and
  AcceptanceSearchAddRow (search + "Aggiungi giocatori"), extracted out of
  AcceptancePicker.vue once the whole toggle block was asked to become its
  own component (user request, 2026-08-24). Same toolbar-swap pattern as
  associates/index.vue's BulkActionsBar/FiltersBar. "Pre-registrati" has no
  bulk bar of its own (no per-row action needing a bulk counterpart there),
  so it uses AcceptanceSearchAddRow directly instead of this wrapper.

  No bulk payment action (removed 2026-08-25, user request) — payment only
  ever applies to a single row now, one real pauperwave_payments write per
  click rather than a loop of N mutation calls with no atomicity.
-->
<script setup lang="ts">
interface AssociateOption {
  value: string
  label: string
}

const { selectedCount, options, isMutating = false } = defineProps<{
  selectedCount: number
  options: AssociateOption[]
  isMutating?: boolean
}>()

const emit = defineEmits<{
  add: []
  removeSelected: []
}>()

const search = defineModel<string>('search', { required: true })
const selectedIds = defineModel<string[]>('selectedIds', { required: true })

const { t } = useI18n()
</script>

<template>
  <div v-if="selectedCount" class="flex items-center justify-end gap-2 mb-2">
    <span class="text-sm text-muted">
      {{ t('tournament.single.acceptancePicker.selectedCount', { count: selectedCount }) }}
    </span>
    <UButton
      color="error"
      variant="subtle"
      :icon="ICONS.delete"
      :label="t('tournament.single.acceptancePicker.removeSelected')"
      :disabled="isMutating"
      @click="emit('removeSelected')"
    />
  </div>

  <TournamentsSingleAcceptanceSearchAddRow
    v-else
    v-model:search="search"
    v-model:selected-ids="selectedIds"
    :options="options"
    @add="emit('add')"
  />
</template>
