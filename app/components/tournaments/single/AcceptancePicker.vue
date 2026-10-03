<!-- app\components\tournaments\single\AcceptancePicker.vue -->
<script lang="ts" setup>
import type { Row } from '@tanstack/vue-table'

interface Props {
  tournamentUuid: string
  // Which pod-size composable the "Iscritti (Pagato)" table-count badge uses (ideal 8/min 6 for
  // Draft, ideal 4/min 3 for Commander, pairs of 2 for 1v1 Swiss): the parent already computes
  // isDraft/is1v1 for its pods/table-preview step, so they are passed through instead of
  // re-deriving `tournament.format`
  isDraft?: boolean
  is1v1?: boolean
  // Once round 1 has started nothing here can change until a turn-back reopens registrations (also
  // enforced server-side: server/utils/tournaments/editLocks.ts)
  readonly?: boolean
}

const {
  tournamentUuid,
  isDraft = false,
  is1v1 = false,
  readonly = false
} = defineProps<Props>()

const { t } = useI18n()

export interface AcceptancePickerItem {
  label: string
  description: string
  avatar: { alt: string }
  value: string
  // When the player pre-registered: the leading column of the "Pre-registrati" list
  preRegisteredAt: Date
}

// Real persistence: tournament_registrations (status 'registered'/'checked_in'/'no_show') +
// pauperwave_payments (Tournament Fee); see docs/PROGRESS.md for why player_uuid, not
// associate_uuid (players is the tournament-identity table decks/stats hang off)
const {
  data: registrationsData,
  isLoading: isRegistrationsLoading
} = useTournamentRegistrationsQuery(() => tournamentUuid)
const { data: associatesData, isLoading: isAssociatesLoading } = useAssociatesQuery()
const {
  registerAssociates, setRegistrationStatus, deleteRegistrations
} = useTournamentRegistrationsMutations(() => tournamentUuid)

const payments = useAcceptancePickerPayments({ tournamentUuid: () => tournamentUuid })
const {
  paymentMethodByPlayer, testPayments, receivedBy, setPaymentMethod, togglePaymentMethod,
  toggleTestPayment, toggleTestPaymentForTargets
} = payments

// Both tables draw from registrations + associates — either still loading
// means the row set shown so far is incomplete, so both tables share one
// combined loading flag rather than each guessing from a partial source.
const isPickerLoading = computed(() => isRegistrationsLoading.value || isAssociatesLoading.value)

// Double-click guard for both tables' row buttons (no-show/payment/remove): any per-row mutation in
// flight disables all of them, since a status change resolving mid-payment-click would race the
// optimistic caches. deleteRegistrations serves "Pre-registrati"'s bulk-remove: unlike "Iscritti
// (Pagato)"'s remove (a checked_in -> registered revert), a pre-registration has no earlier status
// to revert to, so removing it deletes the row
const isMutating = computed(() =>
  registerAssociates.isLoading.value
  || setRegistrationStatus.isLoading.value
  || deleteRegistrations.isLoading.value
  || payments.setPayment.isLoading.value)

// Every action off while a write is in flight, or for good once the tournament has started.
const actionsDisabled = computed(() => readonly || isMutating.value)

const associateByUuid = computed(() =>
  new Map((associatesData.value ?? []).map(associate => [associate.uuid, associate])))

// "Pre-registrati" keeps every registration forever regardless of status: it is the persistent,
// timestamped record of who signed up or was added and when, not a queue that empties as people are
// processed. Acceptance/no-show are a status overlay on it (sourceRowStatus below), not a removal.
// Sorted oldest first (registration order, matching registrationOrderByValue's static "#" below)
const items = computed<AcceptancePickerItem[]>(() => (registrationsData.value ?? [])
  .map((registration) => {
    const associate = associateByUuid.value.get(registration.associateUuid)
    if (!associate) return null
    return {
      label: `${associate.first_name} ${associate.last_name}`,
      description: associate.email_address,
      avatar: { alt: `${associate.first_name} ${associate.last_name}` },
      value: associate.uuid,
      preRegisteredAt: new Date(registration.createdAt)
    }
  })
  .filter((item): item is AcceptancePickerItem => item !== null)
  .sort((a, b) => a.preRegisteredAt.getTime() - b.preRegisteredAt.getTime()))

// Each pre-registered player's "#" is their fixed registration order, not their row position in the
// (search-filtered, shrinking) "Pre-registrati" table: row.index would renumber everyone below a
// removed row. `items` is already in registration order (preRegisteredAt is built from the same
// index), so this is that fixed position, 1-based
const registrationOrderByValue = computed(() =>
  new Map(items.value.map((item, i) => [item.value, i + 1])))

const sourceItems = computed(() => items.value)

const registrationByAssociate = computed(() =>
  new Map(
    (registrationsData.value ?? []).map(registration => [registration.associateUuid, registration])
  ))

type SourceRowStatus = 'pending' | 'accepted' | 'noShow'

function sourceRowStatus(item: AcceptancePickerItem): SourceRowStatus {
  const status = registrationByAssociate.value.get(item.value)?.status
  if (status === 'checked_in') return 'accepted'
  if (status === 'no_show') return 'noShow'
  return 'pending'
}

// "Iscritti (Pagato)", exposed to the parent (the Pods step and the round-count logic need this
// list's size/ids) rather than kept internal. One-way: the server is the source of truth and the
// parent only reads it
const acceptedItems = computed(() => items.value.filter(item => sourceRowStatus(item) === 'accepted'))
const targetItems = defineModel<AcceptancePickerItem[]>('accepted', { default: () => [] })
watch(acceptedItems, (value) => {
  targetItems.value = value
}, { immediate: true })

// Shared by setNoShow/transferToAccepted/both useRemoveConfirmFlow instances
// below — each turns a list of picker items into their underlying
// tournament_registrations uuids before calling a mutation.
function resolveRegistrationUuids(itemsList: AcceptancePickerItem[]): string[] {
  return itemsList
    .map(item => registrationByAssociate.value.get(item.value)?.uuid)
    .filter((uuid): uuid is string => !!uuid)
}

function setNoShow(itemsToUpdate: AcceptancePickerItem[], noShow: boolean) {
  const registrationUuids = resolveRegistrationUuids(itemsToUpdate)

  if (registrationUuids.length)
    setRegistrationStatus.mutate({
      registrationUuids,
      status: noShow ? 'no_show' : 'registered'
    })

  if (noShow) {
    // A no-show row becomes unselectable (sourceRowSelectionOptions below), but that only blocks
    // *future* selection: an existing checked row needs its own explicit deselect
    sourceSelectionState.deselect(itemsToUpdate)
  }
}

function toggleNoShow(item: AcceptancePickerItem) {
  setNoShow([item], sourceRowStatus(item) !== 'noShow')
}

// "Pre-registrati" as a table, not a UListbox: it mirrors "Iscritti (Pagato)"'s table (select / # /
// time / player) plus its own no-show action where the target side has payment/remove.
// Accepted/no-show rows are read-only (enableRowSelection below): once a player has a status it is
// managed from its own side (acceptance from "Iscritti (Pagato)", no-show via the action here).
//
// Both sides' row-selection (checkbox state, shift-click range-select, row-click-to-select) is
// identical, factored into useTableRowSelection
const sourceSelectionState = useTableRowSelection(
  sourceItems, item => item.value, 'sourceTable'
)
const sourceRowSelection = sourceSelectionState.rowSelection
const sourceSelection = sourceSelectionState.selectedItems
const sourceRowHandler = sourceSelectionState
const handleSourceRowSelect = sourceSelectionState.handleRowSelect
const sourceRowSelectionOptions = {
  enableRowSelection: (row: Row<AcceptancePickerItem>) => sourceRowStatus(row.original) === 'pending'
}

const acceptedSelectionState = useTableRowSelection(
  targetItems, item => item.value, 'acceptedTable'
)
const acceptedRowSelection = acceptedSelectionState.rowSelection
const selectedAccepted = acceptedSelectionState.selectedItems
const acceptedRowHandler = acceptedSelectionState
const handleAcceptedRowSelect = acceptedSelectionState.handleRowSelect

// Escape clears whichever table's selection is active, like useSelection.ts, shared via
// useEscapeToClear since these are plain row-selection refs (UTable's shape), not a useSelection()
// instance
useEscapeToClear(
  () => Object.keys(sourceRowSelection.value).length > 0
    || Object.keys(acceptedRowSelection.value).length > 0,
  () => {
    sourceSelectionState.clear()
    acceptedSelectionState.clear()
  }
)

// Per-table search: both tables get their own global-filter search box via SearchInput +
// acceptancePickerGlobalFilterFn (the "identical lists" refactor dropped UListbox's built-in
// `filter`)
const sourceSearch = ref('')
const acceptedSearch = ref('')

// Per-registration check-in time + payment method, keyed by item.value (the associate uuid) and
// synced from the two queries above rather than mutated locally. Plain reactive Records, so
// useAcceptancePickerColumns.ts's cells (reading
// `acceptedAt[item.value]`/`paymentMethodByPlayer[item.value]` directly, not a computed's `.value`)
// needn't change
const acceptedAt = reactive<Record<string, Date>>({})
watch(registrationsData, (registrations) => {
  for (const key of Object.keys(acceptedAt)) Reflect.deleteProperty(acceptedAt, key)
  for (const registration of registrations ?? []) {
    if (registration.checkedInAt) {
      acceptedAt[registration.associateUuid] = new Date(registration.checkedInAt)
    }
  }
}, { immediate: true })

// Shared by the arrow button (the whole selection) and the "Pre-registrati" context menu's
// "Aggiungi agli iscritti" (just the right-clicked row, or resolveContextMenuTargets()'s wider
// selection)
function transferToAccepted(itemsToTransfer: AcceptancePickerItem[]) {
  const registrationUuids = resolveRegistrationUuids(itemsToTransfer)

  if (registrationUuids.length) {
    setRegistrationStatus.mutate({ registrationUuids, status: 'checked_in' })
  }
  sourceSelectionState.deselect(itemsToTransfer)
}

function transferSelected() {
  transferToAccepted(sourceSelection.value)
}

// "Aggiungi giocatori" (walk-ins) — see useWalkInPlayers.ts. A candidate must
// not already be pre-registered or accepted for this tournament.
const knownPlayerIds = computed(() => new Set(items.value.map(item => item.value)))
const {
  addableAssociateOptions, addablePlayerIds, addSelectedAssociates,
  addableSourcePlayerIds, addSelectedToPreRegistered
} = useWalkInPlayers({ tournamentUuid: () => tournamentUuid, knownPlayerIds })

// Confirm-before-destructive-action flow, one instance per side (useRemoveConfirmFlow). The removal
// differs on purpose: "Pre-registrati" hard-deletes via deleteRegistrations (no earlier status to
// fall back to); "Iscritti (Pagato)" reverts status to 'registered' via setRegistrationStatus, NOT
// deleteRegistrations, which also removed the player from "Pre-registrati". Kept as each side's own
// onConfirm callback rather than a mode flag, so that bug can't resurface by mis-parameterizing a
// shared branch
const sourceRemove = useRemoveConfirmFlow<AcceptancePickerItem>({
  getLabel: item => item.label,
  titleKey: 'tournament.single.acceptancePicker.removePreRegisteredConfirmTitle',
  descriptionKey: 'tournament.single.acceptancePicker.removePreRegisteredConfirmDescription',
  descriptionBatchKey: 'tournament.single.acceptancePicker.removePreRegisteredConfirmDescriptionBatch',
  onConfirm: (itemsToRemove) => {
    const registrationUuids = resolveRegistrationUuids(itemsToRemove)
    if (registrationUuids.length) deleteRegistrations.mutate(registrationUuids)
    sourceSelectionState.deselect(itemsToRemove)
  }
})

function requestRemoveSourceSelected() {
  sourceRemove.request(sourceSelection.value)
}

const acceptedRemove = useRemoveConfirmFlow<AcceptancePickerItem>({
  getLabel: item => item.label,
  titleKey: 'tournament.single.acceptancePicker.removeConfirmTitle',
  descriptionKey: 'tournament.single.acceptancePicker.removeConfirmDescription',
  descriptionBatchKey: 'tournament.single.acceptancePicker.removeConfirmDescriptionBatch',
  onConfirm: (itemsToRemove) => {
    const registrationUuids = resolveRegistrationUuids(itemsToRemove)
    if (registrationUuids.length)
      setRegistrationStatus.mutate({ registrationUuids, status: 'registered' })
    for (const item of itemsToRemove) Reflect.deleteProperty(testPayments.value, item.value)
    acceptedSelectionState.deselect(itemsToRemove)
  }
})

function requestRemoveAccepted(item: AcceptancePickerItem) {
  acceptedRemove.request([item])
}

function requestRemoveSelected() {
  acceptedRemove.request(selectedAccepted.value)
}

// Both flows are mutually exclusive (only one side's row actions can be
// mid-confirm at once), so they share one <ConfirmModal> rather than
// rendering two — whichever side has a pending removal drives it.
const activeRemove = computed(() => {
  if (sourceRemove.isOpen.value) return sourceRemove
  if (acceptedRemove.isOpen.value) return acceptedRemove
  return null
})
const removeModalOpen = computed({
  get: () => activeRemove.value !== null,
  set: (value) => {
    if (!value) {
      sourceRemove.isOpen.value = false
      acceptedRemove.isOpen.value = false
    }
  }
})

// Table column definitions live in useAcceptancePickerColumns.ts (about half this file before
// extraction); this call also returns paymentMethodOptions/paymentMethodLabel, reused below by the
// accepted table's context menu instead of its own copy of PAYMENT_METHOD_OPTIONS
const {
  sourceColumns, acceptedColumns, pickerTableUi, sourceTableMeta,
  paymentMethodOptions, paymentMethodLabel
} = useAcceptancePickerColumns({
  sourceRowHandler,
  acceptedRowHandler,
  registrationOrderByValue,
  sourceRowStatus,
  toggleNoShow,
  acceptedAt,
  paymentMethodByPlayer,
  togglePaymentMethod,
  testPayments: testPayments.value,
  toggleTestPayment,
  requestRemoveAccepted,
  isMutating: actionsDisabled
})

// Right-click context menus, both sides — see useAcceptancePickerRowActions.ts.
const {
  sourceTableContextMenuItems, onSourceRowContextmenu,
  acceptedTableContextMenuItems, onAcceptedRowContextmenu
} = useAcceptancePickerRowActions({
  sourceRowStatus,
  sourceSelection,
  transferToAccepted,
  setNoShow,
  selectedAccepted,
  paymentMethodByPlayer,
  paymentMethodOptions,
  paymentMethodLabel,
  setPaymentMethod,
  testPayments: testPayments.value,
  toggleTestPaymentForTargets,
  requestRemoveAcceptedTargets: targets => acceptedRemove.request(targets)
})
</script>

<template>
  <UAlert
    v-if="readonly"
    :title="t('tournament.single.acceptancePicker.lockedTitle')"
    :description="t('tournament.single.acceptancePicker.lockedDescription')"
    :icon="ICONS.lock"
    color="neutral"
    variant="subtle"
    class="mb-3"
  />
  <div class="flex items-start gap-2 w-full">
    <div class="flex flex-col gap-2 w-136 shrink-0">
      <div class="flex items-center justify-between gap-2 min-h-8">
        <h2 class="font-medium text-highlighted">
          {{ t('tournament.single.acceptancePicker.preRegistered') }}
        </h2>
      </div>

      <TournamentsSingleAcceptancePickerToolbarRow
        v-model:search="sourceSearch"
        v-model:selected-ids="addableSourcePlayerIds"
        :selected-count="sourceSelection.length"
        :options="addableAssociateOptions"
        :is-mutating="actionsDisabled"
        @add="addSelectedToPreRegistered"
        @remove-selected="requestRemoveSourceSelected"
      />

      <UContextMenu :items="readonly ? [] : sourceTableContextMenuItems">
        <UTable
          ref="sourceTable"
          v-model:row-selection="sourceRowSelection"
          v-model:global-filter="sourceSearch"
          :global-filter-options="{ globalFilterFn: acceptancePickerGlobalFilterFn }"
          :row-selection-options="sourceRowSelectionOptions"
          :meta="sourceTableMeta"
          :on-select="handleSourceRowSelect"
          :data="sourceItems"
          :columns="sourceColumns"
          :get-row-id="(row: AcceptancePickerItem) => row.value"
          :loading="isPickerLoading"
          class="w-full"
          :ui="pickerTableUi"
          @contextmenu="onSourceRowContextmenu"
        >
          <template #empty>
            <div class="py-8 text-center text-muted text-sm">
              {{ t('tournament.single.acceptancePicker.preRegisteredEmpty') }}
            </div>
          </template>
        </UTable>
      </UContextMenu>
    </div>

    <div class="flex flex-col items-center justify-center gap-1 self-stretch">
      <UButton
        :icon="ICONS.chevronRight"
        color="neutral"
        variant="outline"
        :disabled="!sourceSelection.length || actionsDisabled"
        @click="transferSelected"
      />
    </div>

    <div class="flex flex-col flex-1 gap-2">
      <div class="flex items-center gap-2 min-h-8">
        <h2 class="font-medium text-highlighted">
          {{ t('tournament.single.acceptancePicker.registeredPaid') }}
        </h2>
        <TournamentsSinglePlayersCountBadge
          :count="targetItems.length"
          :is-draft="isDraft"
          :is1v1="is1v1"
        />
        <USelectMenu
          v-model="receivedBy"
          :items="RECEIVER_OPTIONS"
          :placeholder="t('tournament.single.acceptancePicker.receivedByPlaceholder')"
          :disabled="readonly"
          class="w-64 ms-auto"
        />
      </div>

      <TournamentsSingleAcceptancePickerToolbarRow
        v-model:search="acceptedSearch"
        v-model:selected-ids="addablePlayerIds"
        :selected-count="selectedAccepted.length"
        :options="addableAssociateOptions"
        :is-mutating="actionsDisabled"
        @add="addSelectedAssociates"
        @remove-selected="requestRemoveSelected"
      />

      <UContextMenu :items="readonly ? [] : acceptedTableContextMenuItems">
        <UTable
          ref="acceptedTable"
          v-model:row-selection="acceptedRowSelection"
          v-model:global-filter="acceptedSearch"
          :global-filter-options="{ globalFilterFn: acceptancePickerGlobalFilterFn }"
          :on-select="handleAcceptedRowSelect"
          :data="targetItems"
          :columns="acceptedColumns"
          :get-row-id="(row: AcceptancePickerItem) => row.value"
          :loading="isPickerLoading"
          class="w-full"
          :ui="pickerTableUi"
          @contextmenu="onAcceptedRowContextmenu"
        >
          <template #empty>
            <div class="py-8 text-center text-muted text-sm">
              {{ t('tournament.single.acceptancePicker.registeredEmpty') }}
            </div>
          </template>
        </UTable>
      </UContextMenu>
    </div>
  </div>

  <ConfirmModal
    v-model:open="removeModalOpen"
    :title="activeRemove?.title.value ?? ''"
    :description="activeRemove?.description.value"
    :warning="t('common.confirmDeleteWarning')"
    :confirm-label="t('tournament.single.acceptancePicker.removeAction')"
    :confirm-icon="ICONS.delete"
    @confirm="activeRemove?.confirm()"
  />
</template>
