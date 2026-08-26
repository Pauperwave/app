<!-- app\components\tournaments\single\AcceptancePicker.vue -->
<script lang="ts" setup>
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Row, Table } from '@tanstack/vue-table'
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
const { data: registrationsData, isLoading: isRegistrationsLoading }
  = useTournamentRegistrationsQuery(() => tournamentUuid)
const { data: paymentsData } = useTournamentPaymentsQuery(() => tournamentUuid)
const { data: associatesData, isLoading: isAssociatesLoading } = useAssociatesQuery()
const {
  registerAssociates, setRegistrationStatus, setPayment
} = useTournamentRegistrationsMutations(() => tournamentUuid)

// Both tables draw from registrations + associates — either still loading
// means the row set shown so far is incomplete, so both tables share one
// combined loading flag rather than each guessing from a partial source.
const isPickerLoading = computed(() => isRegistrationsLoading.value || isAssociatesLoading.value)

// Double-click guard for the accepted table's row buttons (no-show/payment/
// remove) — any of the two per-row mutations in flight disables all of
// them, since e.g. a status change resolving mid-payment-click would race
// the optimistic caches against each other (user request, 2026-08-25).
const isMutating = computed(() =>
  registerAssociates.isLoading.value
  || setRegistrationStatus.isLoading.value
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
  if (registrationUuids.length) {
    setRegistrationStatus.mutate({ registrationUuids, status: noShow ? 'no_show' : 'registered' })
  }
  if (noShow) {
    // A no-show row becomes unselectable (sourceRowSelectionOptions
    // below), but that only blocks *future* selection — an existing
    // checked row needs its own explicit deselect (user request,
    // 2026-08-24).
    for (const item of itemsToUpdate) Reflect.deleteProperty(sourceRowSelection.value, item.value)
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
const sourceTableContextMenuItems = computed<DropdownMenuItem[]>(() =>
  sourceContextMenuRow.value ? sourceRowContextMenuItems(sourceContextMenuRow.value) : [])

// "Pre-registrati" as a table, not a UListbox — mirrors "Iscritti (Pagato)"'s
// own table (select / # / time / player), plus its own no-show action (user
// request, 2026-08-24) where the target side has payment/remove instead.
// Accepted/no-show rows are read-only (enableRowSelection below) — once a
// player has a status, that status is managed from its own side (acceptance
// from "Iscritti (Pagato)", no-show via the action here), not re-selected.
const sourceRowSelection = ref<Record<string, boolean>>({})
const sourceSelection = computed(() =>
  sourceItems.value.filter(item => sourceRowSelection.value[item.value]))
const sourceRowSelectionOptions = {
  enableRowSelection: (row: Row<AcceptancePickerItem>) => sourceRowStatus(row.original) === 'pending'
}

// Declared here (not lower, next to selectedAccepted) so
// createRowSelectionHandler(acceptedRowSelection) below has it in scope —
// same reasoning as sourceRowSelection just above.
const acceptedRowSelection = ref<Record<string, boolean>>({})

// Escape clears whichever of the two tables' selections is active — same
// guard useSelection.ts uses, shared via useEscapeToClear since these two
// are plain row-selection refs (UTable's own shape), not a useSelection()
// instance (user request, 2026-08-27).
useEscapeToClear(
  () => Object.keys(sourceRowSelection.value).length > 0
    || Object.keys(acceptedRowSelection.value).length > 0,
  () => {
    sourceRowSelection.value = {}
    acceptedRowSelection.value = {}
  }
)

// Per-table search — the "identical lists" refactor above dropped
// UListbox's built-in `filter`, so both tables get their own global-filter
// search box back via SearchInput + acceptancePickerGlobalFilterFn (user
// request, 2026-08-24: "vorrei poter ancora cercare in entrambe le liste").
const sourceSearch = ref('')
const acceptedSearch = ref('')

// Row-selection + shift-click range select, shared shape between the
// "Pre-registrati" and "Iscritti (Pagato)" tables — same
// checkbox-header-with-indeterminate-state pattern as league's own
// WaitingListTable, factored once since both sides need it identically.
function createRowSelectionHandler(rowSelection: Ref<Record<string, boolean>>) {
  let lastIndex: number | null = null
  // Only needed for the checkbox path — its `update:modelValue` reports the
  // new boolean, not the click event, so the shiftKey has to be captured
  // separately from the checkbox's own `click` (fires first). The row-click
  // path gets the real Event and reads `.shiftKey` off it directly (fixed
  // 2026-08-24: shift-click only ever worked when the tiny checkbox itself
  // was clicked, never the rest of the row, since toggleRowSelection used to
  // read this same flag for both paths but nothing ever set it for a
  // row-body click).
  let checkboxShiftKey = false

  function handleCheckboxClick(event: MouseEvent) {
    event.stopPropagation()
    checkboxShiftKey = event.shiftKey
  }

  // A shift-click range builds the next selection object directly off our
  // own `rowSelection` ref and assigns it once — NOT a loop of
  // `row.toggleSelected()` calls. UTable's row-selection is bound via
  // v-model (defineModel inside Nuxt UI's Table.vue), and TanStack's
  // internal table only re-syncs its state.rowSelection from that ref on
  // the next reactive flush, not synchronously mid-function. So N
  // synchronous toggleSelected() calls in a loop each compute their patch
  // against the same pre-loop snapshot — every iteration overwrites the
  // last, and only the final call's write survives (confirmed via debug
  // trace, 2026-08-24: only the first-clicked and last-in-range rows ever
  // ended up selected). Building the whole object from `rowSelection.value`
  // — always current, since it's our own ref — sidesteps that entirely.
  function toggleRowSelection<T>(table: Table<T>, row: Row<T>, value: boolean, shiftKey: boolean) {
    if (shiftKey && lastIndex !== null) {
      const rows = table.getRowModel().rows
      const [start, end] = lastIndex < row.index ? [lastIndex, row.index] : [row.index, lastIndex]
      const next = { ...rowSelection.value }
      for (let i = start; i <= end; i++) {
        const targetRow = rows[i]
        if (!targetRow || !targetRow.getCanSelect()) continue
        if (value) next[targetRow.id] = true
        else Reflect.deleteProperty(next, targetRow.id)
      }
      rowSelection.value = next
      // Anchor stays put on a shift-click (classic Explorer/Sheets
      // behavior, user request, 2026-08-24) — only a plain click below
      // moves it. Deliberately diverges from useSelection.ts's
      // lastToggledId, which slides on every click including shift-clicks;
      // kept separate here rather than unifying, since this fixed-anchor
      // behavior is what was asked for specifically for these two tables.
    } else {
      row.toggleSelected(value)
      lastIndex = row.index
    }
  }

  function toggleFromCheckbox<T>(table: Table<T>, row: Row<T>, value: boolean) {
    toggleRowSelection(table, row, value, checkboxShiftKey)
    checkboxShiftKey = false
  }

  return { handleCheckboxClick, toggleRowSelection, toggleFromCheckbox }
}

const sourceRowHandler = createRowSelectionHandler(sourceRowSelection)
const acceptedRowHandler = createRowSelectionHandler(acceptedRowSelection)

// Clicking anywhere on a row toggles its own checkbox (user request,
// 2026-08-24), not just the checkbox itself — UTable's own `onSelect` prop
// already skips clicks inside a <button>/<a> (see Nuxt UI's Table.vue), so
// this doesn't fight the checkbox's own click handling or the payment/
// actions buttons on the accepted table.
const sourceTableRef = useTemplateRef<{ tableApi: Table<AcceptancePickerItem> }>('sourceTable')
const acceptedTableRef = useTemplateRef<{ tableApi: Table<AcceptancePickerItem> }>('acceptedTable')

function createRowClickSelectHandler(
  handler: ReturnType<typeof createRowSelectionHandler>,
  tableRef: Readonly<Ref<{ tableApi: Table<AcceptancePickerItem> } | null>>
) {
  return (event: Event, row: Row<AcceptancePickerItem>) => {
    const table = tableRef.value?.tableApi
    if (table) {
      handler.toggleRowSelection(table, row, !row.getIsSelected(), (event as MouseEvent).shiftKey)
    }
  }
}

const handleSourceRowSelect = createRowClickSelectHandler(sourceRowHandler, sourceTableRef)
const handleAcceptedRowSelect = createRowClickSelectHandler(acceptedRowHandler, acceptedTableRef)

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
  for (const item of itemsToTransfer) Reflect.deleteProperty(sourceRowSelection.value, item.value)
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

// checked_in -> registered, same status-only transition setNoShow above uses
// for registered <-> no_show — NOT deleteRegistrations. tournament_registrations
// has no separate "Pre-registrati"/"Iscritti (Pagato)" tables, just the one
// row's status; hard-deleting it removed the player from both views instead
// of just "Iscritti (Pagato)" (bug fix, user request 2026-08-27).
function removeAcceptedItems(itemsToRemove: AcceptancePickerItem[]) {
  const registrationUuids = itemsToRemove
    .map(item => registrationByAssociate.value.get(item.value)?.uuid)
    .filter((uuid): uuid is string => !!uuid)
  if (registrationUuids.length) {
    setRegistrationStatus.mutate({ registrationUuids, status: 'registered' })
  }
  for (const item of itemsToRemove) Reflect.deleteProperty(acceptedRowSelection.value, item.value)
}

// Confirm before removing an accepted player, single or batch (user
// request, 2026-08-24) — same ConfirmModal every other destructive action in
// this app uses, not a one-off dialog. An array even for the single-row
// case, so both flows share one confirm/description path.
const pendingRemovals = ref<AcceptancePickerItem[]>([])
const removeConfirmOpen = computed({
  get: () => pendingRemovals.value.length > 0,
  set: (value) => { if (!value) pendingRemovals.value = [] }
})

function requestRemoveAccepted(item: AcceptancePickerItem) {
  pendingRemovals.value = [item]
}

function requestRemoveSelected() {
  if (selectedAccepted.value.length) pendingRemovals.value = selectedAccepted.value
}

function confirmRemoveAccepted() {
  removeAcceptedItems(pendingRemovals.value)
  pendingRemovals.value = []
  acceptedRowSelection.value = {}
}

const removeConfirmDescription = computed(() => {
  if (pendingRemovals.value.length === 1) {
    return t('tournament.single.acceptancePicker.removeConfirmDescription', {
      name: pendingRemovals.value[0]!.label
    })
  }
  if (pendingRemovals.value.length > 1) {
    return t('tournament.single.acceptancePicker.removeConfirmDescriptionBatch', {
      count: pendingRemovals.value.length
    })
  }
  return undefined
})

// Row-selection checkboxes for "Iscritti (Pagato)" (user request,
// 2026-08-24: "mancano delle checkbox da ambo i lati") — same
// checkbox-header-with-indeterminate-state + per-row shape as league's own
// WaitingListTable. Shift-click range select comes from acceptedRowHandler
// (see createRowSelectionHandler above), shared with the source table.
const selectedAccepted = computed(() =>
  targetItems.value.filter(item => acceptedRowSelection.value[item.value]))

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
  setPayment.mutate({ associateUuid: item.value, method, receivedBy: receivedBy.value })
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
      onSelect: () => { pendingRemovals.value = targets }
    }
  ]
}

const acceptedContextMenuRow = ref<AcceptancePickerItem | null>(null)
function onAcceptedRowContextmenu(_event: Event, row: { original: AcceptancePickerItem }) {
  acceptedContextMenuRow.value = row.original
}
const acceptedTableContextMenuItems = computed<DropdownMenuItem[]>(() =>
  acceptedContextMenuRow.value ? acceptedRowContextMenuItems(acceptedContextMenuRow.value) : [])
</script>

<template>
  <div class="flex items-start gap-2 w-full">
    <div class="flex flex-col gap-1 w-[34rem] shrink-0">
      <div class="flex items-center justify-between gap-2 min-h-8">
        <h2 class="font-medium text-highlighted">
          {{ t('tournament.single.acceptancePicker.preRegistered') }}
        </h2>
        <div v-if="sourceSelection.length" class="flex items-center gap-2">
          <span class="text-sm text-muted">
            {{ t(
              'tournament.single.acceptancePicker.selectedCount', { count: sourceSelection.length }
            ) }}
          </span>
        </div>
      </div>

      <TournamentsSingleAcceptanceSearchAddRow
        v-model:search="sourceSearch"
        v-model:selected-ids="addableSourcePlayerIds"
        :options="addableAssociateOptions"
        @add="addSelectedToPreRegistered"
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

      <TournamentsSingleAcceptedToolbarRow
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
    v-model:open="removeConfirmOpen"
    :title="t('tournament.single.acceptancePicker.removeConfirmTitle')"
    :description="removeConfirmDescription"
    :warning="t('common.confirmDeleteWarning')"
    :confirm-label="t('tournament.single.acceptancePicker.removeAction')"
    :confirm-icon="ICONS.delete"
    @confirm="confirmRemoveAccepted"
  />
</template>
