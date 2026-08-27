<!-- app\components\tournaments\single\AcceptancePicker.vue -->
<script lang="ts" setup>
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Row } from '@tanstack/vue-table'
import type { PaymentMethod } from '#shared/types/transactions'

interface Props {
  tournamentUuid: string
  // Which pod-size composable the "Iscritti (Pagato)" table-count badge uses
  // (ideal 8/min 6 for Draft vs. ideal 4/min 3 for Commander) — parent
  // already computes this for the Draft-only PodsManager step, passed
  // through rather than re-deriving `tournament.format === 'Draft'` here.
  isDraft?: boolean
}

const { tournamentUuid, isDraft = false } = defineProps<Props>()

const { t } = useI18n()
const toast = useToast()

export interface AcceptancePickerItem {
  label: string
  description: string
  avatar: { alt: string }
  value: string
  // When the player pre-registered — shown as the leading column in the
  // "Pre-registrati" list (user request, 2026-08-24).
  preRegisteredAt: Date
}

// Real persistence, wired 2026-08-25: tournament_registrations (status:
// 'registered'/'checked_in'/'no_show') + pauperwave_payments (Tournament
// Fee) — see docs/PROGRESS.md for why player_uuid, not associate_uuid
// directly (players is the tournament-identity table decks/stats hang off).
const {
  data: registrationsData,
  isLoading: isRegistrationsLoading
} = useTournamentRegistrationsQuery(() => tournamentUuid)
const { data: paymentsData } = useTournamentPaymentsQuery(() => tournamentUuid)
const { data: associatesData, isLoading: isAssociatesLoading } = useAssociatesQuery()
const {
  registerAssociates, setRegistrationStatus, deleteRegistrations, setPayment
} = useTournamentRegistrationsMutations(() => tournamentUuid)

// Both tables draw from registrations + associates — either still loading
// means the row set shown so far is incomplete, so both tables share one
// combined loading flag rather than each guessing from a partial source.
const isPickerLoading = computed(() => isRegistrationsLoading.value || isAssociatesLoading.value)

// Double-click guard for both tables' row buttons (no-show/payment/remove)
// — any of the per-row mutations in flight disables all of them, since e.g.
// a status change resolving mid-payment-click would race the optimistic
// caches against each other (user request, 2026-08-25). deleteRegistrations
// re-added 2026-08-27 for "Pre-registrati"'s own bulk-remove — unlike
// "Iscritti (Pagato)"'s remove (a checked_in -> registered status revert), a
// pre-registration has no further status to revert to, so removing one here
// really does mean deleting the row.
const isMutating = computed(() =>
  registerAssociates.isLoading.value
  || setRegistrationStatus.isLoading.value
  || deleteRegistrations.isLoading.value
  || setPayment.isLoading.value)

const associateByUuid = computed(() =>
  new Map((associatesData.value ?? []).map(associate => [associate.uuid, associate])))

// "Pre-registrati" keeps every registration forever regardless of status —
// it represents the persistent, timestamped registration record (who
// signed up, or was added, and when), not a queue that empties out as
// people get processed (user request, 2026-08-24: "non vorrei perdere
// traccia di queste persone"). Acceptance/no-show are just a status overlay
// on top of it (sourceRowStatus below), not a removal. Sorted oldest first —
// registration order, matching registrationOrderByValue's "static #" below.
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

// Each pre-registered player's "#" is their fixed registration order, not
// their current row position in the (possibly search-filtered, definitely
// shrinking-as-people-get-accepted) "Pre-registrati" table — row.index would
// renumber everyone below a removed/filtered-out row (user request,
// 2026-08-24: "il numero a loro affidato dovrebbe essere statico").
// `items` is already in registration order (preRegisteredAt above is built
// from the same index), so this is just that fixed position, 1-based.
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

// "Iscritti (Pagato)" — exposed to the parent (the Pods step and the round-
// count logic both need this list's size/ids) rather than kept as purely
// internal state (user request, 2026-08-24). One-way now (server is the
// source of truth) — the parent only ever reads this, never assigns it.
const acceptedItems = computed(() => items.value.filter(item => sourceRowStatus(item) === 'accepted'))
const targetItems = defineModel<AcceptancePickerItem[]>('accepted', { default: () => [] })
watch(acceptedItems, (value) => {
  targetItems.value = value
}, { immediate: true })

function setNoShow(itemsToUpdate: AcceptancePickerItem[], noShow: boolean) {
  const registrationUuids = itemsToUpdate
    .map(item => registrationByAssociate.value.get(item.value)?.uuid)
    .filter((uuid): uuid is string => !!uuid)

  if (registrationUuids.length)
    setRegistrationStatus.mutate({
      registrationUuids,
      status: noShow ? 'no_show' : 'registered'
    })

  if (noShow) {
    // A no-show row becomes unselectable (sourceRowSelectionOptions
    // below), but that only blocks *future* selection — an existing
    // checked row needs its own explicit deselect (user request,
    // 2026-08-24).
    sourceSelectionState.deselect(itemsToUpdate)
  }
}

function toggleNoShow(item: AcceptancePickerItem) {
  setNoShow([item], sourceRowStatus(item) !== 'noShow')
}

// Right-clicking a row that's part of the current multi-selection acts on
// the whole selection, not just that one row (user request, 2026-08-24: "the
// contextual menu actions should work on every selected item") — same
// "clicked row decides the target action, selection decides the scope"
// convention for both tables' context menus below.
function resolveContextMenuTargets<T extends AcceptancePickerItem>(
  clicked: T, selection: T[]
): T[] {
  return selection.length > 1 && selection.some(selected => selected.value === clicked.value)
    ? selection
    : [clicked]
}

// Right-click context menu, "Pre-registrati" side (user request, 2026-08-24)
// — same UContextMenu-wrapping-UTable + "row set on @contextmenu, items
// computed from it" pattern as associates' useAssociatesRowActions.ts.
// Mirrors the visible no-show toggle button; empty for an already-accepted
// row (nothing left to do from this side, same as the button's own
// `if (status === 'accepted') return null`).
function sourceRowContextMenuItems(item: AcceptancePickerItem): DropdownMenuItem[] {
  const status = sourceRowStatus(item)
  if (status === 'accepted') return []

  const targets = resolveContextMenuTargets(item, sourceSelection.value)
  const markAsNoShow = status !== 'noShow'

  return [
    // Only for pending rows — a no-show shouldn't be silently accepted
    // without first clearing that status (user request, 2026-08-24:
    // "Aggiungi l'azione di 'Aggiunta agli iscritti'"), same single-item vs.
    // whole-selection scope as the no-show action below.
    ...(status === 'pending'
      ? [{
        label: targets.length > 1
          ? t('tournament.single.acceptancePicker.addToAcceptedMenuLabelBulk', { count: targets.length })
          : t('tournament.single.acceptancePicker.addToAcceptedMenuLabel'),
        icon: ICONS.playerConfirmed,
        onSelect: () => transferToAccepted(targets)
      }, { type: 'separator' as const }]
      : []),
    {
      label: targets.length > 1
        ? t(
          markAsNoShow
            ? 'tournament.single.acceptancePicker.markNoShowMenuLabelBulk'
            : 'tournament.single.acceptancePicker.unmarkNoShowMenuLabelBulk',
          { count: targets.length }
        )
        : t(
          markAsNoShow
            ? 'tournament.single.acceptancePicker.markNoShowMenuLabel'
            : 'tournament.single.acceptancePicker.unmarkNoShowMenuLabel'
        ),
      icon: ICONS.noShow,
      onSelect: () => setNoShow(targets, markAsNoShow)
    }
  ]
}

const sourceContextMenuRow = ref<AcceptancePickerItem | null>(null)
function onSourceRowContextmenu(_event: Event, row: { original: AcceptancePickerItem }) {
  sourceContextMenuRow.value = row.original
}
const sourceTableContextMenuItems = computed<DropdownMenuItem[]>(
  () => sourceContextMenuRow.value
    ? sourceRowContextMenuItems(sourceContextMenuRow.value)
    : []
)

// "Pre-registrati" as a table, not a UListbox — mirrors "Iscritti (Pagato)"'s
// own table (select / # / time / player), plus its own no-show action (user
// request, 2026-08-24) where the target side has payment/remove instead.
// Accepted/no-show rows are read-only (enableRowSelection below) — once a
// player has a status, that status is managed from its own side (acceptance
// from "Iscritti (Pagato)", no-show via the action here), not re-selected.
//
// Both sides' row-selection (checkbox state + shift-click range-select +
// row-click-to-select) is byte-identical — factored into useTableRowSelection
// once "Pre-registrati" grew its own bulk-remove and needed a second copy
// (user request, 2026-08-27).
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

// Escape clears whichever of the two tables' selections is active — same
// guard useSelection.ts uses, shared via useEscapeToClear since these two
// are plain row-selection refs (UTable's own shape), not a useSelection()
// instance (user request, 2026-08-27).
useEscapeToClear(
  () => Object.keys(sourceRowSelection.value).length > 0
    || Object.keys(acceptedRowSelection.value).length > 0,
  () => {
    sourceSelectionState.clear()
    acceptedSelectionState.clear()
  }
)

// Per-table search — the "identical lists" refactor above dropped
// UListbox's built-in `filter`, so both tables get their own global-filter
// search box back via SearchInput + acceptancePickerGlobalFilterFn (user
// request, 2026-08-24: "vorrei poter ancora cercare in entrambe le liste").
const sourceSearch = ref('')
const acceptedSearch = ref('')

// Per-registration check-in time + payment method — keyed by item.value
// (the associate uuid), synced from the two queries above rather than
// mutated locally, but kept as plain reactive Records so
// useAcceptancePickerColumns.ts's column cells (which read
// `acceptedAt[item.value]`/`paymentMethodByPlayer[item.value]` directly, not
// through a computed's `.value`) don't need to change at all.
const acceptedAt = reactive<Record<string, Date>>({})
watch(registrationsData, (registrations) => {
  for (const key of Object.keys(acceptedAt)) Reflect.deleteProperty(acceptedAt, key)
  for (const registration of registrations ?? []) {
    if (registration.checkedInAt) {
      acceptedAt[registration.associateUuid] = new Date(registration.checkedInAt)
    }
  }
}, { immediate: true })

const paymentMethodByPlayer = reactive<Record<string, PaymentMethod | null>>({})
watch(paymentsData, (payments) => {
  for (const key of Object.keys(paymentMethodByPlayer)) {
    Reflect.deleteProperty(paymentMethodByPlayer, key)
  }
  for (const payment of payments ?? []) {
    paymentMethodByPlayer[payment.associateUuid] = payment.paymentMethod
  }
}, { immediate: true })

// Shared by the arrow button (whole current selection) and the
// "Pre-registrati" context menu's "Aggiungi agli iscritti" action (user
// request, 2026-08-24), which passes just the right-clicked row or
// resolveContextMenuTargets()'s wider selection.
function transferToAccepted(itemsToTransfer: AcceptancePickerItem[]) {
  const registrationUuids = itemsToTransfer
    .map(item => registrationByAssociate.value.get(item.value)?.uuid)
    .filter((uuid): uuid is string => !!uuid)

  if (registrationUuids.length) {
    setRegistrationStatus.mutate({ registrationUuids, status: 'checked_in' })
  }
  sourceSelectionState.deselect(itemsToTransfer)
}

function transferSelected() {
  transferToAccepted(sourceSelection.value)
}

// "Aggiungi giocatori" — ported from MagicTheGathering/league's WaitingList.vue
// (user request, 2026-08-24), for walk-ins: any club associate not already
// pre-registered or accepted, searched/multi-selected and added straight into
// "Iscritti (Pagato)", skipping the pre-registration step entirely. Reads the
// real associates roster (not just the pre-registered pool), since a walk-in
// by definition isn't one of tonight's pre-registered names.
const addablePlayerIds = ref<string[]>([])

const knownPlayerIds = computed(() => new Set(items.value.map(item => item.value)))
// Only currently-active members are real "giocatori" — excludes
// pending/rejected requests and expired/unpaid/to_renew memberships (user
// request, 2026-08-24: "stiamo aggiungendo 'associati' non giocatori").
// Also excludes APS Pauperwave's own registry record (PW-0000, uuid constant
// from useTransactionFormOptions) — the association itself, not a player,
// same exclusion useTransactionFormFields.ts already applies for payers.
const addableAssociates = computed(() =>
  (associatesData.value ?? []).filter(associate =>
    !knownPlayerIds.value.has(associate.uuid)
    && associate.uuid !== APS_PAUPERWAVE_ASSOCIATE_UUID
    && associate.membership_status === 'active'))
const addableAssociateOptions = computed(() => addableAssociates.value.map(associate => ({
  value: associate.uuid,
  label: `${associate.first_name} ${associate.last_name}`
})))

function addSelectedAssociates() {
  if (!addablePlayerIds.value.length) return
  registerAssociates.mutate({ associateUuids: addablePlayerIds.value, status: 'checked_in' })
  addablePlayerIds.value = []
}

// Same "Aggiungi giocatori" mechanism as above, but onto "Pre-registrati"
// itself rather than straight into "Iscritti (Pagato)" (user request,
// 2026-08-24: "come faccio ad aggiungere persone all'elenco dei
// preregistrati?") — shares the same addableAssociateOptions pool, since
// knownPlayerIds already excludes anyone in either list regardless of which
// one they get added to.
const addableSourcePlayerIds = ref<string[]>([])

function addSelectedToPreRegistered() {
  if (!addableSourcePlayerIds.value.length) return
  registerAssociates.mutate({ associateUuids: addableSourcePlayerIds.value })
  addableSourcePlayerIds.value = []
}

// Confirm-before-destructive-action flow, one instance per side — extracted
// into useRemoveConfirmFlow once both sides grew a byte-identical copy of it
// (user request, 2026-08-27). The actual removal differs on purpose:
// "Pre-registrati" hard-deletes via deleteRegistrations (no earlier status
// to fall back to for a pre-registration); "Iscritti (Pagato)" reverts
// status to 'registered' via setRegistrationStatus — NOT deleteRegistrations,
// which used to (mistakenly) also remove the player from "Pre-registrati"
// (bug fix, user request 2026-08-27) — kept as each side's own onConfirm
// callback rather than a mode flag, so that bug can't resurface by
// mis-parameterizing a shared branch.
const sourceRemove = useRemoveConfirmFlow<AcceptancePickerItem>({
  getLabel: item => item.label,
  titleKey: 'tournament.single.acceptancePicker.removePreRegisteredConfirmTitle',
  descriptionKey: 'tournament.single.acceptancePicker.removePreRegisteredConfirmDescription',
  descriptionBatchKey: 'tournament.single.acceptancePicker.removePreRegisteredConfirmDescriptionBatch',
  onConfirm: (itemsToRemove) => {
    const registrationUuids = itemsToRemove
      .map(item => registrationByAssociate.value.get(item.value)?.uuid)
      .filter((uuid): uuid is string => !!uuid)
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
    const registrationUuids = itemsToRemove
      .map(item => registrationByAssociate.value.get(item.value)?.uuid)
      .filter((uuid): uuid is string => !!uuid)
    if (registrationUuids.length)
      setRegistrationStatus.mutate({ registrationUuids, status: 'registered' })
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

// Who's running the check-in desk right now — required to record a *new*
// pauperwave_payments row (received_by is NOT NULL, and there's no
// "current logged-in user" to default it to, same gap already flagged in
// useAssociatesBulkActions.ts). Chosen once per session from
// RECEIVER_OPTIONS, not per click — these payment buttons have no form of
// their own (user request, 2026-08-25).
const receivedBy = ref<string | undefined>(undefined)

// Payment is single-row only (removed bulk 2026-08-25, user request: "I was
// thinking to remove the bulk actions for payment so I remove a whole class
// of errors and cases") — one real pauperwave_payments write per click,
// no loop of N mutation calls with no atomicity between them.
function setPaymentMethod(item: AcceptancePickerItem, method: PaymentMethod | null) {
  // Only a brand-new payment strictly needs receivedBy server-side (an
  // update to an existing row keeps its own) — but this session-wide
  // desk-staff selection is still worth nudging for up front, since
  // silently omitting it on every subsequent click would be confusing.
  if (method !== null && !paymentMethodByPlayer[item.value] && !receivedBy.value) {
    toast.add({
      title: t('tournament.single.acceptancePicker.receivedByRequiredTitle'),
      description: t('tournament.single.acceptancePicker.receivedByRequiredDescription'),
      color: 'warning'
    })
    return
  }
  setPayment.mutate({
    associateUuid: item.value,
    method, receivedBy:
    receivedBy.value
  })
}

function togglePaymentMethod(item: AcceptancePickerItem, method: PaymentMethod) {
  setPaymentMethod(item, paymentMethodByPlayer[item.value] === method ? null : method)
}

// Table column definitions live in useAcceptancePickerColumns.ts (extracted
// once they made up roughly half this file, user request, 2026-08-24) —
// this call also returns paymentMethodOptions/paymentMethodLabel, reused
// below by the accepted table's context menu so it doesn't need its own
// copy of PAYMENT_METHOD_OPTIONS.
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
  requestRemoveAccepted,
  isMutating
})

// Right-click context menu, "Iscritti (Pagato)" side (user request,
// 2026-08-24) — mirrors the visible payment-method buttons + remove button,
// same UContextMenu pattern as the source table above. Payment is always
// single-row (see setPaymentMethod above); remove stays bulk-aware
// (resolveContextMenuTargets) since it's already one batched network call,
// not a loop.
function acceptedRowContextMenuItems(item: AcceptancePickerItem): DropdownMenuItem[] {
  const method = paymentMethodByPlayer[item.value] ?? null
  const targets = resolveContextMenuTargets(item, selectedAccepted.value)
  const bulk = targets.length > 1

  return [
    ...paymentMethodOptions.map((option): DropdownMenuItem => {
      const badge = PAYMENT_METHOD_BADGE_CONFIG[option]
      const label = paymentMethodLabel(option)
      return {
        label,
        icon: badge.icon,
        color: method === option ? badge.color : undefined,
        onSelect: () => setPaymentMethod(item, method === option ? null : option)
      }
    }),
    { type: 'separator' as const },
    {
      label: bulk
        ? t('tournament.single.acceptancePicker.removeActionBulk', { count: targets.length })
        : t('tournament.single.acceptancePicker.removeAction'),
      icon: ICONS.delete,
      color: 'error' as const,
      onSelect: () => acceptedRemove.request(targets)
    }
  ]
}

const acceptedContextMenuRow = ref<AcceptancePickerItem | null>(null)
function onAcceptedRowContextmenu(_event: Event, row: { original: AcceptancePickerItem }) {
  acceptedContextMenuRow.value = row.original
}
const acceptedTableContextMenuItems = computed<DropdownMenuItem[]>(
  () => acceptedContextMenuRow.value
    ? acceptedRowContextMenuItems(acceptedContextMenuRow.value)
    : []
)
</script>

<template>
  <div class="flex items-start gap-2 w-full">
    <div class="flex flex-col gap-1 w-136 shrink-0">
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
        :is-mutating="isMutating"
        @add="addSelectedToPreRegistered"
        @remove-selected="requestRemoveSourceSelected"
      />

      <UContextMenu :items="sourceTableContextMenuItems">
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
        :disabled="!sourceSelection.length || isMutating"
        @click="transferSelected"
      />
    </div>

    <div class="flex flex-col flex-1 gap-1">
      <div class="flex items-center gap-2 min-h-8">
        <h2 class="font-medium text-highlighted">
          {{ t('tournament.single.acceptancePicker.registeredPaid') }}
        </h2>
        <TournamentsSinglePlayersCountBadge :count="targetItems.length" :is-draft="isDraft" />
        <USelectMenu
          v-model="receivedBy"
          :items="RECEIVER_OPTIONS"
          :placeholder="t('tournament.single.acceptancePicker.receivedByPlaceholder')"
          class="w-48 ms-auto"
        />
      </div>

      <TournamentsSingleAcceptancePickerToolbarRow
        v-model:search="acceptedSearch"
        v-model:selected-ids="addablePlayerIds"
        :selected-count="selectedAccepted.length"
        :options="addableAssociateOptions"
        :is-mutating="isMutating"
        @add="addSelectedAssociates"
        @remove-selected="requestRemoveSelected"
      />

      <UContextMenu :items="acceptedTableContextMenuItems">
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
