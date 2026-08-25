// app\composables\players\usePlayersTableColumns.ts
import { h } from 'vue'
import { AssociateTag, HighlightMatch } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { Player } from '~/types'
import type { MemberRole } from '#shared/types/settings'
import AssociateNumberBadge from '~/components/ui/AssociateNumberBadge.vue'
import DateWithRelativeTooltip from '~/components/ui/DateWithRelativeTooltip.vue'
import RoleBadge from '~/components/ui/RoleBadge.vue'

export function usePlayersTableColumns(
  search?: Ref<string>,
  // uuid (players.uuid, matching PlayerLastLogin.playerUuid) -> ISO
  // timestamp or null (never signed in, or no linked auth user). Optional,
  // same reasoning as `search` — a plain column-def function shouldn't force
  // every caller to also fetch usePlayersLastLoginsQuery.ts.
  lastLogins?: Ref<Map<string, string | null>>,
  // associate_uuid -> role, from useMembersQuery.ts (which only returns rows
  // for organizer/admin/super_admin — assign_role deletes the user_roles row
  // entirely for 'player', see that composable's own comment). Missing from
  // the map means 'player', same default useMembersQuery.get.ts's server
  // endpoint would apply if this player had a row there at all (user
  // request, 2026-08-25).
  roleByAssociateUuid?: Ref<Map<string, MemberRole>>
) {
  const { t } = useI18n()

  // No "Stato" column: the page only offers "Attivi"/"Non attivi" tabs (no
  // "all" view like associates' membership_request_status), so is_active
  // would repeat the same badge on every row of any given tab — same
  // reasoning as transactions/index.vue hiding its payment_type column while
  // a single type tab is active, just permanent here since there's no "all".
  const columnHeaders: Record<string, string> = {
    id: t('player.columns.id'),
    name: t('player.columns.name'),
    pauperwave_associate_number: t('player.columns.pauperwaveAssociateNumber'),
    role: t('player.columns.role'),
    email_address: t('player.columns.emailAddress'),
    created_at: t('player.columns.createdAt'),
    last_login: t('player.columns.lastLogin')
  }

  const columns: TableColumn<Player>[] = [
    {
      accessorKey: 'id',
      header: ({ column }) => sortableHeader(t('player.columns.id'), column),
      meta: {
        class: {
          th: 'whitespace-nowrap text-right',
          td: 'whitespace-nowrap font-mono text-dimmed text-right'
        }
      },
      cell: ({ row }) => row.original.id
    },
    {
      accessorKey: 'name',
      header: ({ column }) => sortableHeader(t('player.columns.name'), column),
      // first_name + last_name — same display name as the associate this
      // player is derived from (user request, 2026-08-20).
      cell: ({ row }) => h(AssociateTag, {
        name: `${row.original.first_name} ${row.original.last_name}`,
        associateUuid: row.original.associate_uuid,
        highlightQuery: search?.value
      })
    },
    {
      accessorKey: 'pauperwave_associate_number',
      header: ({ column }) => sortableHeader(t('player.columns.pauperwaveAssociateNumber'), column),
      meta: { class: { th: 'text-center', td: 'text-center' } },
      cell: ({ row }) =>
        h(AssociateNumberBadge, { number: row.original.pauperwave_associate_number })
    },
    {
      id: 'role',
      header: columnHeaders.role,
      meta: { class: { th: 'text-center', td: 'text-center' } },
      cell: ({ row }) => {
        const role: MemberRole = row.original.associate_uuid
          ? roleByAssociateUuid?.value.get(row.original.associate_uuid) ?? 'player'
          : 'player'
        return h(RoleBadge, { role })
      }
    },
    {
      accessorKey: 'email_address',
      header: t('player.columns.emailAddress'),
      cell: ({ row }) => (row.original.email_address && search?.value
        ? h(HighlightMatch, { text: row.original.email_address, query: search.value })
        : row.original.email_address)
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => sortableHeader(t('player.columns.createdAt'), column),
      meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
      cell: ({ row }) =>
        h(DateWithRelativeTooltip, { isoString: row.original.created_at, time: false })
    },
    {
      id: 'last_login',
      header: columnHeaders.last_login,
      meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
      cell: ({ row }) => {
        const lastSignInAt = row.original.uuid ? lastLogins?.value.get(row.original.uuid) : null
        return lastSignInAt
          ? h(DateWithRelativeTooltip, { isoString: lastSignInAt, time: true })
          : h('span', { class: 'text-dimmed' }, t('player.neverLoggedIn'))
      }
    }
  ]

  return { columns, columnHeaders }
}
