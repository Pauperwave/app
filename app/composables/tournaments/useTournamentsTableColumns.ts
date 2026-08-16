// app\composables\tournaments\useTournamentsTableColumns.ts
// fallow-ignore-file code-duplication -- mirrors useEventsTableColumns.ts's
// status-badge column shape on purpose; expected to diverge once real Supabase
// tables land
import { h } from 'vue'
import {
  BadgesFormatBadge, EditIconButton, UBadge, UCheckbox
} from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { Tournament } from '~/types'
import type { Selection } from '~/composables/useSelection'

// Pure config except for `selection`/`onEdit` (depends only on t() otherwise) —
// same reasoning as useWantedCardsTableColumns.ts. Both are threaded through
// rather than read from a composable here, since that state
// (useSelection.ts/useTournamentsRowActions.ts) is owned by the page, not
// this file. No grouping in this table (unlike wanted-cards), so the select
// column skips the subRows/indeterminate-group-checkbox branch.
export function useTournamentsTableColumns(
  selection: Selection<number>,
  onEdit: (tournament: Tournament) => void
) {
  const { t } = useI18n()

  // Captured from the checkbox's own native `click` (fires synchronously
  // before the `update:modelValue` it triggers) so a shift-click can be told
  // apart from a plain one — UCheckbox's v-model only reports the new value,
  // not the triggering event. Function-scoped, shared across every
  // checkbox's render, same convention as useWantedCardsTableColumns.ts.
  let lastClickShiftKey = false

  const selectColumn: TableColumn<Tournament> = {
    id: 'select',
    enableSorting: false,
    enableHiding: false,
    meta: { class: { th: 'w-px p-0', td: 'w-px p-0' } },
    header: ({ table: tableApi }) => {
      const ids = tableApi.getFilteredRowModel().rows.map(row => row.original.id)
      const allSelected = ids.length > 0 && ids.every(id => selection.isSelected(id))
      const someSelected = ids.some(id => selection.isSelected(id))
      return centerTableCell(h(UCheckbox, {
        'modelValue': allSelected ? true : (someSelected ? 'indeterminate' : false),
        'onUpdate:modelValue': (value: unknown) => selection.setAll(ids, !!value),
        'aria-label': t('common.selectAll')
      }))
    },
    // stopPropagation: the row itself navigates on click too (UTable's
    // @select, see tournaments/index.vue) — without this, toggling the
    // checkbox would also navigate away underneath it.
    cell: ({ row, table: tableApi }) => {
      const range = tableApi.getFilteredRowModel().rows.map(r => r.original.id)
      return centerTableCell(h(UCheckbox, {
        'modelValue': selection.isSelected(row.original.id),
        'onUpdate:modelValue': () =>
          selection.toggle(row.original.id, { shiftKey: lastClickShiftKey, range }),
        'onClick': (e: MouseEvent) => {
          e.stopPropagation()
          lastClickShiftKey = e.shiftKey
        },
        'aria-label': t('common.selectRow')
      }))
    }
  }

  const columnHeaders: Record<string, string> = {
    status: t('tournament.columns.status'),
    name: t('tournament.columns.name'),
    startDate: t('tournament.columns.startDate'),
    format: t('tournament.columns.format'),
    location: t('tournament.columns.location'),
    registeredPlayers: t('tournament.columns.registeredPlayers'),
    entryFee: t('tournament.columns.entryFee'),
    actions: t('tournament.columns.actions')
  }

  const columns: TableColumn<Tournament>[] = [
    selectColumn,
    {
      accessorKey: 'status',
      header: ({ column }) => sortableHeader(t('tournament.columns.status'), column),
      cell: ({ row }) => h(UBadge, {
        color: tournamentStatusColor(row.original.status),
        variant: 'subtle',
        icon: TOURNAMENT_STATUS_ICONS[row.original.status]
      }, () => t(`tournament.status.${row.original.status}`))
    },
    {
      accessorKey: 'name',
      header: ({ column }) => sortableHeader(t('tournament.columns.name'), column),
      cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.name)
    },
    {
      accessorKey: 'startDate',
      header: ({ column }) => sortableHeader(t('tournament.columns.startDate'), column),
      cell: ({ row }) => new Date(row.original.startDate).toLocaleString('it-IT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    {
      accessorKey: 'format',
      header: ({ column }) => sortableHeader(t('tournament.columns.format'), column),
      cell: ({ row }) => h(BadgesFormatBadge, { format: row.original.format })
    },
    {
      accessorKey: 'location',
      header: t('tournament.columns.location')
    },
    {
      accessorKey: 'registeredPlayers',
      header: ({ column }) => sortableHeader(t('tournament.columns.registeredPlayers'), column)
    },
    {
      accessorKey: 'entryFee',
      header: ({ column }) => sortableHeader(t('tournament.columns.entryFee'), column),
      cell: ({ row }) => `${(row.original.entryFee ?? 0).toFixed(2)} €`
    },
    {
      id: 'actions',
      header: t('tournament.columns.actions'),
      // stopPropagation: the row itself also navigates on click (UTable's
      // @select, see tournaments/index.vue) — without this, clicking the
      // edit button would open the edit modal AND navigate away underneath it.
      cell: ({ row }) => h(EditIconButton, {
        label: t('tournament.rowActions.edit'),
        size: 'xs',
        onClick: (e: MouseEvent) => {
          e.stopPropagation()
          onEdit(row.original)
        }
      })
    }
  ]

  return { columns, columnHeaders }
}
