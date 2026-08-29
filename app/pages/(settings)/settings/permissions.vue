<!-- app\pages\(settings)\settings\permissions.vue -->
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { UBadge, UIcon, UTooltip } from '#components'
import type { Row } from '@tanstack/vue-table'
import type { AppRole } from '~/types'

definePageMeta({ permission: 'access-settings' })

const { t, te } = useI18n()

useSeoMeta({ title: () => t('settings.layout.links.permissions') })

type Access = 'full' | 'partial' | 'none'
type RoleKey = 'player' | 'organizer' | 'admin' | 'superAdmin'
type GroupKey
  = 'finance' | 'standings' | 'tournaments' | 'locations' | 'wantedCards' | 'players'
    | 'commanderDecks' | 'membership' | 'rulesets' | 'trash' | 'roles'

// Whether the row describes real, working code today — separate from the
// role grid itself (which is the *intended* policy, docs/architecture/
// roles.md/permissions.md). Verified by hand against server/api/* and
// app/pages/* 2026-08-23 (user request), not derived automatically — keep
// in sync the same way the role columns already are, re-check whenever a
// row's underlying feature actually gets built/changed.
type ImplementationStatus = 'implemented' | 'partial' | 'notImplemented'

interface RoleCell {
  access: Access
  /** Detail shown on hover — the per-row/per-role "why", e.g. what "partial" means
   * specifically here. Absent for most 'full' cells and always absent for 'none'
   * (nothing to explain beyond the blank cell itself). */
  note?: string
}

interface PermissionRow {
  /** A section-header pseudo-row (one per theme, e.g. "Carte Cercate") rather
   * than a real permission — every column but `feature` is blank for these,
   * see the column cell functions below. */
  isSection?: boolean
  group: GroupKey
  feature: string
  status?: ImplementationStatus
  /** Detail shown on hover for 'partial'/'notImplemented' rows — what's
   * missing or wrong today. Absent for 'implemented' rows. */
  statusNote?: string
  /** Unauthenticated access — the public/no-login-required equivalent of a
   * feature, e.g. viewing standings via /rankings/<format> (ADR-011,
   * docs/PROGRESS.md). Kept separate from `player` (the lowest *logged-in*
   * role) since the two aren't the same access boundary — most rows have no
   * public equivalent at all, hence optional/defaulting to 'none' like the
   * others. */
  publicAccess?: RoleCell
  player?: RoleCell
  organizer?: RoleCell
  admin?: RoleCell
  superAdmin?: RoleCell
}

// Grouped by domain (reordered 2026-08-23 — was purely by increasing role,
// which scattered same-domain rows, e.g. the four Carte Cercate rows weren't
// consecutive; within each domain group below, still lowest-to-highest
// role). Section order follows the sidebar nav, not docs/architecture/
// permissions.md's own order (see the `return` below) — that file is still
// the source of truth for the full "why" behind each row, this table is
// just its in-app rendering, not a second decision. Keep both in sync by
// hand until PERMISSION_LEVEL
// (docs/architecture/roles.md) actually exists in code and this can compute
// itself from it instead.
const rows = computed<PermissionRow[]>(() => {
  type RowKey
    // Finanze e transazioni
    = | 'viewFinance'
      // Standings
      | 'viewStandings'
      // Tournaments / leagues / events
      | 'viewTournaments' | 'registerTournament' | 'manageTournaments' | 'resetPairing'
      | 'cancelRound' | 'manageEventPayments' | 'deleteTournaments'
      // Luoghi
      | 'manageLocations'
      // Carte Cercate
      | 'viewWantedCards' | 'createWantedCard' | 'updateOwnWantedCardStatus'
      | 'deleteOwnWantedCard' | 'manageOthersWantedCards'
      // Giocatori
      | 'viewPlayers'
      // Mazzi Commander
      | 'manageOwnDecks' | 'manageAllDecks' | 'deleteCommanderDeck'
      // Anagrafica / quote associative
      | 'viewAssociates' | 'viewOwnMembership' | 'manageMembers' | 'manageMembershipFees' | 'sendPaymentReceipts'
      // Regolamenti
      | 'manageRulesets' | 'deleteRuleset'
      // Cestino
      | 'viewTrash' | 'purgeTrash'
      // Ruoli
      | 'manageRoles'
  type NoteKey = 'publicNote' | 'playerNote' | 'organizerNote' | 'adminNote' | 'superAdminNote'

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

  const row = (
    key: RowKey,
    status: ImplementationStatus,
    access: [CellSpec, CellSpec, CellSpec, CellSpec],
    // Defaults to 'none' — most rows have no unauthenticated equivalent at
    // all, only pass this for the handful that do (e.g. viewStandings).
    publicAccess: CellSpec = 'none'
  ): Omit<PermissionRow, 'group'> => {
    const [player, organizer, admin, superAdmin] = access
    const statusNotePath = `settings.permissions.rows.${key}.statusNote`
    return {
      feature: t(`settings.permissions.rows.${key}.feature`),
      status,
      statusNote: te(statusNotePath) ? t(statusNotePath) : undefined,
      publicAccess: cell(key, publicAccess),
      player: cell(key, player),
      organizer: cell(key, organizer),
      admin: cell(key, admin),
      superAdmin: cell(key, superAdmin)
    }
  }

  // A section-header pseudo-row (bold feature text, every other column
  // blank — see the column cell functions below) plus tagging every row in
  // the block that follows with its theme (user request, 2026-08-29: divide
  // the table into sections by theme, e.g. "Carte Cercate"). One table, not
  // one per section — a separate <table> per section wouldn't share a single
  // <colgroup>, so the "feature" column's shrink-to-fit width (see its own
  // comment below) would independently reflow per section instead of lining
  // up down the page.
  const group = (key: GroupKey, items: Omit<PermissionRow, 'group'>[]): PermissionRow[] => [
    { isSection: true, group: key, feature: t(`settings.permissions.groups.${key}`) },
    ...items.map(item => ({ ...item, group: key }))
  ]

  // Section order follows the sidebar nav (useMainNavGroups.ts), not
  // docs/architecture/permissions.md's own order (user request, 2026-08-29):
  // Dashboards (Finanze) → Community (Associati/Richieste, Giocatori, then
  // Carte Cercate) → Competizioni (Tornei/Leghe/Eventi, Luoghi, Regolamenti
  // last) → Classifiche → Commander (Mazzi Commander) → Impostazioni
  // (Membri → roles, Cestino last).
  //
  // viewFinance/viewAssociates/viewPlayers/manageLocations/manageRulesets
  // (2026-08-29, user request — cross-referenced against the full
  // Permission union in app/utils/permissions.ts) are all notImplemented:
  // none of their pages declare `definePageMeta({ permission: ... })`, only
  // the sidebar hides the link — any authenticated user can still open them
  // directly by URL. viewTrash is the one exception (trash.vue does have
  // the guard), included here anyway to keep the Cestino section complete.
  return [
    ...group('finance', [
      row('viewFinance', 'notImplemented', ['none', 'full', 'full', 'full'])
    ]),

    ...group('membership', [
      row('viewAssociates', 'notImplemented', ['none', 'full', 'full', 'full']),
      row('viewOwnMembership', 'implemented', [
        ['partial', 'playerNote'], ['partial', 'organizerNote'], ['full', 'adminNote'], ['full', 'superAdminNote']
      ]),
      row('manageMembers', 'implemented', ['none', 'none', 'full', 'full']),
      row('manageMembershipFees', 'implemented', ['none', 'none', 'full', 'full']),
      row('sendPaymentReceipts', 'notImplemented', ['none', 'none', 'full', 'full'])
    ]),

    ...group('players', [
      row('viewPlayers', 'notImplemented', ['none', 'full', 'full', 'full'])
    ]),

    ...group('wantedCards', [
      row('viewWantedCards', 'implemented', ['full', 'full', 'full', 'full']),
      row('createWantedCard', 'implemented', [['partial', 'playerNote'], 'full', 'full', 'full']),
      row('updateOwnWantedCardStatus', 'partial', [['partial', 'playerNote'], 'full', 'full', 'full']),
      row('deleteOwnWantedCard', 'implemented', ['none', 'full', 'full', 'full']),
      row('manageOthersWantedCards', 'implemented', ['none', 'full', 'full', 'full'])
    ]),

    ...group('tournaments', [
      row('viewTournaments', 'implemented', ['full', 'full', 'full', 'full'], ['partial', 'publicNote']),
      row('registerTournament', 'notImplemented', [['partial', 'playerNote'], 'full', 'full', 'full']),
      row('manageTournaments', 'implemented', ['none', 'full', 'full', 'full']),
      row('resetPairing', 'notImplemented', ['none', 'full', 'full', 'full']),
      row('cancelRound', 'notImplemented', ['none', 'none', 'full', 'full']),
      row('manageEventPayments', 'implemented', ['none', 'full', 'full', 'full']),
      row('deleteTournaments', 'notImplemented', ['none', 'none', 'none', 'full'])
    ]),

    ...group('locations', [
      row('manageLocations', 'notImplemented', ['none', 'full', 'full', 'full'])
    ]),

    ...group('rulesets', [
      row('manageRulesets', 'notImplemented', ['none', 'full', 'full', 'full']),
      row('deleteRuleset', 'notImplemented', ['none', 'none', 'full', 'full'])
    ]),

    ...group('standings', [
      row('viewStandings', 'implemented', ['full', 'full', 'full', 'full'], 'full')
    ]),

    ...group('commanderDecks', [
      row('manageOwnDecks', 'notImplemented', ['full', 'full', 'full', 'full']),
      row('manageAllDecks', 'notImplemented', ['none', 'none', 'full', 'full']),
      row('deleteCommanderDeck', 'notImplemented', ['none', 'none', 'full', 'full'])
    ]),

    ...group('roles', [
      row('manageRoles', 'implemented', ['none', 'none', 'full', 'full'])
    ]),

    ...group('trash', [
      row('viewTrash', 'implemented', ['none', 'none', 'full', 'full']),
      row('purgeTrash', 'implemented', ['none', 'none', 'none', 'full'])
    ])
  ]
})

// Same semantic colours the rest of the app uses for status (UBadge success/
// warning/error elsewhere) — full/partial maps onto them directly. 'none' has no
// entry: those cells render blank (see roleColumn below), not an X — a grid mostly
// full of "no access" icons was pure noise, the blank space already reads as "no."
const ACCESS_META: Record<'full' | 'partial', { icon: string, color: string }> = {
  full: { icon: ICONS.successFilled, color: 'text-success' },
  partial: { icon: ICONS.circleDot, color: 'text-warning' }
}

// Legend only covers the two states that actually render something — 'none' is
// the unlabelled blank space, self-explanatory once the other two are defined.
const legend = computed(() => (['full', 'partial'] as const).map(access => ({
  access,
  label: t(`settings.permissions.access.${access}`)
})))

// Badge, not a bare icon like ACCESS_META — this column reads left-to-right as
// its own sentence ("Implementato" / "Parziale" / "Non implementato"), unlike
// the role grid where the column header already supplies the missing word.
const STATUS_META: Record<ImplementationStatus, { color: 'success' | 'warning' | 'error' }> = {
  implemented: { color: 'success' },
  partial: { color: 'warning' },
  notImplemented: { color: 'error' }
}

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

// RoleKey is camelCase ('superAdmin'), ROLE_ICON (app/utils/roles.ts) is
// keyed by the live AppRole union ('super_admin') — this is the one place
// the two need bridging, everywhere else already uses one or the other.
const ROLE_KEY_TO_APP_ROLE = {
  player: 'player', organizer: 'organizer', admin: 'admin', superAdmin: 'super_admin'
} as const satisfies Record<RoleKey, AppRole>

// Shared by publicColumn/roleColumn below — both render the same
// full/partial icon (or nothing, for 'none'/blank) from a RoleCell.
function accessCell(roleCell: RoleCell | undefined) {
  if (!roleCell) return null
  const { access, note } = roleCell
  if (access === 'none') return null

  const icon = h(UIcon, { name: ACCESS_META[access].icon, class: ['size-5', ACCESS_META[access].color] })
  return note ? h(UTooltip, { text: note }, () => icon) : icon
}

function roleColumn(role: RoleKey): TableColumn<PermissionRow> {
  return {
    accessorKey: role,
    header: () => h('span', { class: 'flex items-center justify-center gap-1.5 text-sm' }, [
      h(UIcon, { name: ROLE_ICON[ROLE_KEY_TO_APP_ROLE[role]], class: 'size-4' }),
      t(`settings.permissions.columns.${role}`)
    ]),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => accessCell(row.original[role])
  }
}

// Unauthenticated access (user request, 2026-08-29) — same RoleCell shape
// and icon set as the four role columns, just keyed off `publicAccess`
// instead of a RoleKey and with no ROLE_ICON lookup (not a real AppRole).
function publicColumn(): TableColumn<PermissionRow> {
  return {
    accessorKey: 'publicAccess',
    header: () => h('span', { class: 'flex items-center justify-center gap-1.5 text-sm' }, [
      h(UIcon, { name: ICONS.globe, class: 'size-4' }),
      t('settings.permissions.columns.public')
    ]),
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => accessCell(row.original.publicAccess)
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
    cell: ({ row }) => row.original.isSection
      ? h('span', { class: 'font-semibold text-highlighted block mt-3' }, row.original.feature)
      : renderFeature(row.original.feature)
  },
  {
    accessorKey: 'status',
    header: () => h('span', { class: 'text-sm' }, t('settings.permissions.columns.status')),
    meta: { class: { th: 'whitespace-nowrap w-px text-center', td: 'whitespace-nowrap w-px text-center' } },
    cell: ({ row }) => {
      const { status, statusNote } = row.original
      if (!status) return null
      const badge = h(UBadge, {
        color: STATUS_META[status].color,
        variant: 'subtle'
      }, () => t(`settings.permissions.status.${status}`))
      return statusNote ? h(UTooltip, { text: statusNote }, () => badge) : badge
    }
  },
  publicColumn(),
  roleColumn('player'),
  roleColumn('organizer'),
  roleColumn('admin'),
  roleColumn('superAdmin')
]
</script>

<template>
  <UPageCard
    :title="$t('settings.permissions.title')"
    :description="$t('settings.permissions.description')"
    :ui="{ container: 'gap-2' }"
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
      :meta="{
        class: {
          // Section rows have nothing in the other columns to divide from
          // (blank cells either side) — meant to override the ui.tr default
          // below per-row (user request, 2026-08-29). Nuxt UI's tv() slots
          // concatenate meta.class.tr with :ui's own tr class rather than
          // tailwind-merging them (confirmed via devtools: both divide-x and
          // divide-x-0 end up in the class list at once), so plain
          // divide-x-0 lost to divide-x on stylesheet order, not HTML class
          // order — trailing `!` (Tailwind v4 important syntax) forces it.
          tr: (row: Row<PermissionRow>) => (row.original.isSection ? 'divide-x-0!' : '')
        }
      }"
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
</template>
