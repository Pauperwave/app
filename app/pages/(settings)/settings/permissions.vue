<!-- app\pages\(settings)\settings\permissions.vue -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { UIcon, UTooltip } from '#components'

const { t, te } = useI18n()

type Access = 'full' | 'partial' | 'none'
type RoleKey = 'player' | 'organizer' | 'admin' | 'superAdmin'

interface RoleCell {
  access: Access
  /** Detail shown on hover — the per-row/per-role "why", e.g. what "partial" means
   * specifically here. Absent for most 'full' cells and always absent for 'none'
   * (nothing to explain beyond the blank cell itself). */
  note?: string
}

interface PermissionRow {
  feature: string
  player: RoleCell
  organizer: RoleCell
  admin: RoleCell
  superAdmin: RoleCell
}

// Ordered by increasing required role, same order as docs/architecture/permissions.md
// — that file is the source of truth (with the full "why" behind each row); this
// table is its in-app rendering, not a second decision. Keep both in sync by hand
// until PERMISSION_LEVEL (docs/architecture/roles.md) actually exists in code and
// this can compute itself from it instead.
const rows = computed<PermissionRow[]>(() => {
  type RowKey
    = | 'viewStandings' | 'viewTournaments' | 'registerTournament' | 'viewWantedCards'
      | 'createWantedCard' | 'updateOwnWantedCardStatus' | 'manageOwnDecks' | 'viewOwnMembership'
      | 'manageTournaments' | 'resetPairing' | 'manageEventPayments' | 'deleteOwnWantedCard'
      | 'manageOthersWantedCards' | 'sendPaymentReceipts' | 'manageAllDecks' | 'manageMembers'
      | 'manageMembershipFees' | 'deleteTournaments' | 'cancelRound' | 'deleteCommanderDeck'
      | 'deleteRuleset' | 'manageRoles'
  type NoteKey = 'playerNote' | 'organizerNote' | 'adminNote' | 'superAdminNote'

  // 'full'/'none' shorthand for the common case (no note); pass [key, noteKey] for
  // a cell that needs one — te() checks the key exists first, since most rows don't
  // define all four *Note keys and t() on a missing key just echoes the key back.
  type CellSpec = Access | [Access, NoteKey]
  const cell = (key: RowKey, spec: CellSpec): RoleCell => {
    if (typeof spec === 'string') return { access: spec }
    const [access, noteKey] = spec
    const path = `settings.permissions.rows.${key}.${noteKey}`
    return { access, note: te(path) ? t(path) : undefined }
  }

  const row = (key: RowKey, access: [CellSpec, CellSpec, CellSpec, CellSpec]): PermissionRow => {
    const [player, organizer, admin, superAdmin] = access
    return {
      feature: t(`settings.permissions.rows.${key}.feature`),
      player: cell(key, player),
      organizer: cell(key, organizer),
      admin: cell(key, admin),
      superAdmin: cell(key, superAdmin)
    }
  }

  return [
    row('viewStandings', ['full', 'full', 'full', 'full']),
    row('viewTournaments', ['full', 'full', 'full', 'full']),
    row('registerTournament', [['partial', 'playerNote'], 'full', 'full', 'full']),
    row('viewWantedCards', ['full', 'full', 'full', 'full']),
    row('createWantedCard', [['partial', 'playerNote'], 'full', 'full', 'full']),
    row('updateOwnWantedCardStatus', [['partial', 'playerNote'], 'full', 'full', 'full']),
    row('manageOwnDecks', ['full', 'full', 'full', 'full']),
    row('viewOwnMembership', [
      ['partial', 'playerNote'], ['partial', 'organizerNote'], ['full', 'adminNote'], ['full', 'superAdminNote']
    ]),
    row('manageTournaments', ['none', 'full', 'full', 'full']),
    row('resetPairing', ['none', 'full', 'full', 'full']),
    row('manageEventPayments', ['none', 'full', 'full', 'full']),
    row('deleteOwnWantedCard', ['none', 'full', 'full', 'full']),
    row('manageOthersWantedCards', ['none', 'full', 'full', 'full']),
    row('sendPaymentReceipts', ['none', 'none', 'full', 'full']),
    row('manageAllDecks', ['none', 'none', 'full', 'full']),
    row('manageMembers', ['none', 'none', 'full', 'full']),
    row('manageMembershipFees', ['none', 'none', 'full', 'full']),
    row('deleteTournaments', ['none', 'none', 'none', 'full']),
    row('cancelRound', ['none', 'none', 'none', 'full']),
    row('deleteCommanderDeck', ['none', 'none', 'none', 'full']),
    row('deleteRuleset', ['none', 'none', 'none', 'full']),
    row('manageRoles', ['none', 'none', 'none', 'full'])
  ]
})

// Same semantic colours the rest of the app uses for status (UBadge success/
// warning/error elsewhere) — full/partial maps onto them directly. 'none' has no
// entry: those cells render blank (see roleColumn below), not an X — a grid mostly
// full of "no access" icons was pure noise, the blank space already reads as "no."
const ACCESS_META: Record<'full' | 'partial', { icon: string, color: string }> = {
  full: { icon: 'i-lucide-circle-check', color: 'text-success' },
  partial: { icon: 'i-lucide-circle-dot', color: 'text-warning' }
}

// Legend only covers the two states that actually render something — 'none' is
// the unlabelled blank space, self-explanatory once the other two are defined.
const legend = computed(() => (['full', 'partial'] as const).map(access => ({
  access,
  label: t(`settings.permissions.access.${access}`)
})))

function roleColumn(role: RoleKey): TableColumn<PermissionRow> {
  return {
    accessorKey: role,
    header: () => h('span', { class: 'text-sm' }, t(`settings.permissions.columns.${role}`)),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => {
      const { access, note } = row.original[role]
      if (access === 'none') return null

      const icon = h(UIcon, { name: ACCESS_META[access].icon, class: ['size-5', ACCESS_META[access].color] })
      return note ? h(UTooltip, { text: note }, () => icon) : icon
    }
  }
}

const columns: TableColumn<PermissionRow>[] = [
  {
    accessorKey: 'feature',
    header: () => t('settings.permissions.columns.feature'),
    // w-px + whitespace-nowrap: the standard shrink-to-fit trick, so the column is
    // exactly as wide as its longest row and no wider — without it, w-full on the
    // table below stretches this column to fill leftover space with blank padding
    // instead of the icon columns doing that. Deliberately no whitespace-normal
    // wrapping either, unlike domains.vue: every row stays on one line.
    meta: { class: { th: 'whitespace-nowrap w-px', td: 'whitespace-nowrap w-px' } }
  },
  roleColumn('player'),
  roleColumn('organizer'),
  roleColumn('admin'),
  roleColumn('superAdmin')
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <UAlert
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="$t('settings.permissions.warning.title')"
      :description="$t('settings.permissions.warning.description')"
    />

    <UPageCard
      :title="$t('settings.permissions.title')"
      :description="$t('settings.permissions.description')"
      :ui="{ container: 'gap-4' }"
    >
      <template #header>
        <div class="flex items-center gap-4 text-sm text-muted">
          <span v-for="item in legend" :key="item.access" class="flex items-center gap-1.5">
            <UIcon :name="ACCESS_META[item.access].icon" :class="['size-4', ACCESS_META[item.access].color]" />
            {{ item.label }}
          </span>
        </div>
      </template>

      <!-- Wrapping div carries the scoped class, not UTable directly: a class prop
           passed straight to a child component still lands on its root element
           (confirmed), but nesting it like StandingsMatrixTable.vue's proven
           working pattern removes any doubt about scoped-attribute propagation
           to a child component's root instead of an ordinary element. -->
      <div class="permissions-table">
        <UTable
          :data="rows"
          :columns="columns"
          class="w-full"
          :ui="{ td: 'py-1.5 px-3 text-sm', th: 'py-1.5 px-3' }"
        />
      </div>
    </UPageCard>
  </div>
</template>

<style scoped>
/* Row hover, same treatment as StandingsMatrixTable.vue: no transition — with 22
   rows × 5 columns it's not the perf concern the ~1300-cell matrix tables were,
   but a plain :hover is still free where a transition measurably wasn't there. */
.permissions-table :deep(tbody tr:hover > td) {
  background-color: var(--ui-bg-elevated);
}
</style>
