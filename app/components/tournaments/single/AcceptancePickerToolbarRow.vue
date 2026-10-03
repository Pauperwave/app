<!-- app\components\tournaments\single\AcceptancePickerToolbarRow.vue -->
<!-- Shared toolbar row for "Pre-registrati" and "Iscritti (Pagato)": it swaps between the
     bulk-selection bar (just "Rimuovi selezionati", once a row is selected) and
     AcceptanceSearchAddRow (search + "Aggiungi giocatori"). Extracted from
     AcceptancePicker.vue, with the same toolbar-swap pattern as associates/index.vue's
     BulkActionsBar/FiltersBar and nothing accepted-specific in its props/emits.  No bulk
     payment action: payment only applies to a single row, one real pauperwave_payments write
     per click rather than a loop of N mutation calls with no atomicity. -->
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
  <div v-if="selectedCount" class="flex items-center justify-end gap-2">
    <span class="text-sm text-muted">
      {{ t('tournament.single.acceptancePicker.selectedCount', { count: selectedCount }) }}
    </span>
    <UButton
      color="error"
      variant="subtle"
      :icon="ICONS.delete"
      :label="withCount(t('tournament.single.acceptancePicker.removeSelected'), selectedCount)"
      :disabled="isMutating"
      @click="emit('removeSelected')"
    />
  </div>

  <TournamentsSingleAcceptanceSearchAddRow
    v-else
    v-model:search="search"
    v-model:selected-ids="selectedIds"
    :options="options"
    :disabled="isMutating"
    @add="emit('add')"
  />
</template>
