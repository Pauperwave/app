<!-- app\pages\(settings)\settings\permissions.vue -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { UIcon, UTooltip } from '#components'

definePageMeta({ permission: 'access-settings' })

const { t, te } = useI18n()

useSeoMeta({ title: () => t('settings.layout.links.permissions') })

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
  full: { icon: ICONS.successFilled, color: 'text-success' },
  partial: { icon: 'i-lucide-circle-dot', color: 'text-warning' }
}

// Legend only covers the two states that actually render something — 'none' is
// the unlabelled blank space, self-explanatory once the other two are defined.
const legend = computed(() => (['full', 'partial'] as const).map(access => ({
  access,
  label: t(`settings.permissions.access.${access}`)
})))

// Two things to highlight inline in a feature description, matched together
// so overlapping matches can't fight each other:
// - `**word**` markers (set by hand in it.json, one per verb — e.g.
//   "**Creare**, **modificare** tornei..." for rows with more than one verb)
//   render as <strong>, since which words are verbs isn't reliably derivable
//   from the Italian text alone.
// - an in-app route mentioned inline (e.g. the "(/associates)" in "Gestire
//   l'anagrafica soci (/associates)") renders in the same font-mono style
//   domains.vue uses for routes — but only a path, not any "/" in running
//   text: the lookbehind requires the slash to start right after whitespace,
//   an opening paren, or the start of the string, so e.g.
//   "Assegnare/modificare" (a "/" mid-word) is left as plain text.
const INLINE_PATTERN = /\*\*(.+?)\*\*|(?<=^|[\s(])\/[a-zA-Z][\w-]*(?:\/[\w-]+)*/g

function renderFeature(text: string) {
  const parts: (string | ReturnType<typeof h>)[] = []
  let lastIndex = 0
  for (const match of text.matchAll(INLINE_PATTERN)) {
    if (match.index! > lastIndex) parts.push(text.slice(lastIndex, match.index))
    parts.push(match[1]
      ? h('strong', match[1])
      : h('code', { class: 'font-mono' }, match[0]))
    lastIndex = match.index! + match[0].length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

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
    meta: { class: { th: 'whitespace-nowrap w-px', td: 'whitespace-nowrap w-px' } },
    cell: ({ row }) => renderFeature(row.original.feature)
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

      <UTable
        :data="rows"
        :columns="columns"
        class="w-full"
        :ui="{
          td: 'py-1.5 px-3 text-sm group-hover:bg-(--ui-bg-elevated)',
          th: 'py-1.5 px-3',
          // Row hover via the public `ui` slot API instead of a scoped :deep()
          // selector: no wrapper div needed, and it doesn't assume UTable's
          // internal DOM shape (tbody > tr > td) stays the same across versions —
          // `tr`/`td` here are UTable's own documented slot names, not a guess.
          // Standard Tailwind group/group-hover, not an arbitrary variant: `tr`
          // marked as the group, `td` reacts to its hover state. Plain :hover, no
          // transition — same reasoning as PublicMatrixTable.vue for why that
          // stays cheap at this table size.
          tr: 'group divide-x divide-default'
        }"
      />
    </UPageCard>
  </div>
</template>
