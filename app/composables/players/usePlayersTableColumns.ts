// app\composables\players\usePlayersTableColumns.ts
import { h } from 'vue'
import { AssociateTag, HighlightMatch } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { Player } from '~/types'
import DateWithRelativeTooltip from '~/components/ui/DateWithRelativeTooltip.vue'

export function usePlayersTableColumns(search?: Ref<string>) {
  const { t } = useI18n()

  // No "Stato" column: the page only offers "Attivi"/"Non attivi" tabs (no
  // "all" view like associates' membership_request_status), so is_active
  // would repeat the same badge on every row of any given tab — same
  // reasoning as transactions/index.vue hiding its payment_type column while
  // a single type tab is active, just permanent here since there's no "all".
  const columnHeaders: Record<string, string> = {
    name: t('player.columns.name'),
    pauperwave_associate_number: t('player.columns.pauperwaveAssociateNumber'),
    email_address: t('player.columns.emailAddress'),
    created_at: t('player.columns.createdAt')
  }

  const columns: TableColumn<Player>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => sortableHeader(t('player.columns.name'), column),
      cell: ({ row }) => {
        const name = row.original.nickname
          || `${row.original.first_name} ${row.original.last_name}`
        return h(AssociateTag, {
          name, associateUuid: row.original.associate_uuid, highlightQuery: search?.value
        })
      }
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
    }
  ]

  return { columns, columnHeaders }
}
