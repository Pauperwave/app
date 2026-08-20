// app\composables\players\usePlayersTableColumns.ts
import { h } from 'vue'
import { AssociateTag, HighlightMatch } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { Player } from '~/types'
import DateWithRelativeTooltip from '~/components/ui/DateWithRelativeTooltip.vue'

export function usePlayersTableColumns(
  search?: Ref<string>,
  // uuid (players.uuid, matching PlayerLastLogin.playerUuid) -> ISO
  // timestamp or null (never signed in, or no linked auth user). Optional,
  // same reasoning as `search` — a plain column-def function shouldn't force
  // every caller to also fetch usePlayersLastLoginsQuery.ts.
  lastLogins?: Ref<Map<string, string | null>>
) {
  const { t } = useI18n()

  // No "Stato" column: the page only offers "Attivi"/"Non attivi" tabs (no
  // "all" view like associates' membership_request_status), so is_active
  // would repeat the same badge on every row of any given tab — same
  // reasoning as transactions/index.vue hiding its payment_type column while
  // a single type tab is active, just permanent here since there's no "all".
  const columnHeaders: Record<string, string> = {
    name: t('player.columns.name'),
    nickname: t('player.columns.nickname'),
    pauperwave_associate_number: t('player.columns.pauperwaveAssociateNumber'),
    email_address: t('player.columns.emailAddress'),
    created_at: t('player.columns.createdAt'),
    last_login: t('player.columns.lastLogin')
  }

  const columns: TableColumn<Player>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => sortableHeader(t('player.columns.name'), column),
      // first_name + last_name, not nickname — same display name as the
      // associate this player is derived from (user request, 2026-08-20).
      // Nickname stays a separate, plain-text column below.
      cell: ({ row }) => h(AssociateTag, {
        name: `${row.original.first_name} ${row.original.last_name}`,
        associateUuid: row.original.associate_uuid,
        highlightQuery: search?.value
      })
    },
    {
      accessorKey: 'nickname',
      header: columnHeaders.nickname,
      cell: ({ row }) => (row.original.nickname && search?.value
        ? h(HighlightMatch, { text: row.original.nickname, query: search.value })
        : row.original.nickname || '')
    },
    {
      accessorKey: 'pauperwave_associate_number',
      header: ({ column }) => sortableHeader(t('player.columns.pauperwaveAssociateNumber'), column),
      meta: { class: { th: 'text-right', td: 'text-right font-mono' } },
      cell: ({ row }) => row.original.pauperwave_associate_number || ''
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
