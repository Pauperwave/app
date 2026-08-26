<!-- app\components\tournaments\single\AcceptancePickerToolbarRow.vue -->
<!--
  Shared toolbar row for both "Pre-registrati" and "Iscritti (Pagato)" —
  swaps between the bulk-selection bar (just "Rimuovi selezionati", once at
  least one row is selected) and AcceptanceSearchAddRow (search + "Aggiungi
  giocatori"). Extracted out of AcceptancePicker.vue for "Iscritti (Pagato)"
  first (user request, 2026-08-24), then reused as-is for "Pre-registrati"
  once that side got its own bulk-remove action too (user request,
  2026-08-27) — same toolbar-swap pattern as associates/index.vue's
  BulkActionsBar/FiltersBar either way, nothing accepted-specific in its
  props/emits.

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
