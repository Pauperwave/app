// app\composables\wantedCards\useWantedCardsTableColumns.ts
import { h } from 'vue'
import { UBadge, UIcon } from '#components'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { WantedCard } from '~/types'
import ManaCost from '~/components/magic/ManaCost.vue'
import CardPreviewTooltip from '~/components/magic/CardPreviewTooltip.vue'
import AssociateTag from '~/components/ui/AssociateTag.vue'
import DateWithRelativeTooltip from '~/components/ui/DateWithRelativeTooltip.vue'
import RowActionsMenu from '~/components/ui/RowActionsMenu.vue'
import type { Selection } from '~/composables/useSelection'

// Pure config (depends only on t()) — extracted from the page to isolate the ~110
// lines of column definitions from the rest of the view's logic.
// Direct import from #components instead of resolveComponent(): the latter only
// works reliably inside a .vue file's <script setup> block (where the compiler
// rewrites it), not from a plain .ts file — used here it caused "Failed to resolve
// component" at runtime.
export function useWantedCardsTableColumns(
  selection: Selection<number>,
  rowContextMenuItems: (card: WantedCard) => DropdownMenuItem[]
) {
  const { t } = useI18n()

  // Bound to the shared selectedIds Set (useSelection.ts), not UTable's own
  // row-selection state — grouping (rows with subRows) needs a group's checkbox
  // to reflect/drive all its subRows at once, which the id-Set model handles
  // the same way as the plain "select all" header checkbox. See
  // useGroupedSelectColumn.ts for the shared implementation.
  const selectColumn = useGroupedSelectColumn<WantedCard>(selection)

  // Readable labels for the "Columns" menu — same i18n map used for the actual
  // column headers (pattern from associates/index.vue).
  const columnHeaders: Record<string, string> = {
    player: t('wantedCard.columns.player'),
    cmc: t('wantedCard.columns.manaCost'),
    cardName: t('wantedCard.columns.name'),
    cardmarketPrice: t('wantedCard.columns.cardmarketPrice'),
    cardtraderPrice: t('wantedCard.columns.cardtraderPrice'),
    copies: t('wantedCard.columns.copies'),
    language: t('wantedCard.columns.language'),
    treatment: t('wantedCard.columns.treatment'),
    date: t('wantedCard.columns.date'),
    status: t('wantedCard.columns.status'),
    notes: t('wantedCard.columns.notes'),
    createdBy: t('wantedCard.columns.createdBy'),
    createdAt: t('wantedCard.columns.createdAt'),
    updatedBy: t('wantedCard.columns.updatedBy'),
    updatedAt: t('wantedCard.columns.updatedAt'),
    actions: t('wantedCard.columns.actions')
  }

  const columns: TableColumn<WantedCard>[] = [
    selectColumn,
    {
      accessorKey: 'player',
      header: ({ column }) => sortableHeader(t('wantedCard.columns.player'), column),
      // Sorts groups by number of requests (subRows), not alphabetically by name —
      // that is what is actually useful when the table is grouped.
      sortingFn: (rowA, rowB) => (rowA.subRows?.length ?? 0) - (rowB.subRows?.length ?? 0),
      cell: ({ row, getValue }) => {
        if (!row.getIsGrouped()) return h(AssociateTag, { name: getValue<string>() })
        return h('button', {
          type: 'button',
          class: 'flex items-center gap-1.5 font-medium cursor-pointer',
          onClick: () => row.toggleExpanded()
        }, [
          h(UIcon, {
            name: row.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight,
            class: 'size-4'
          }),
          h(AssociateTag, { name: getValue<string>() }),
          h(UBadge, { color: 'neutral', variant: 'subtle', size: 'sm' }, () => String(row.subRows.length))
        ])
      }
    },
    {
      accessorKey: 'cmc',
      header: ({ column }) => sortableHeader(t('wantedCard.columns.manaCost'), column),
      // Conventional MTG collection ordering: colour group first (W, U, B, R, G,
      // multicolour, colourless), then ascending mana cost — same algorithm as
      // MagicTheGathering/league (colorGroupRank).
      sortingFn: (rowA, rowB) => {
        const colorDiff = colorGroupRank(rowA.original.colorIdentity)
          - colorGroupRank(rowB.original.colorIdentity)
        return colorDiff !== 0 ? colorDiff : rowA.original.cmc - rowB.original.cmc
      },
      cell: ({ row }) => row.getIsGrouped() ? null : h(ManaCost, { manaCost: row.original.manaCost, size: 'sm' })
    },
    {
      accessorKey: 'cardName',
      header: ({ column }) => sortableHeader(t('wantedCard.columns.name'), column),
      // No more Scryfall link on click: hover does not exist on mobile, and
      // CardPreviewTooltip already handles the tap with a full-screen modal — same
      // behaviour as magic/card/Tooltip.vue in MagicTheGathering/blog.
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h(CardPreviewTooltip, { name: row.original.cardName, imageUrl: row.original.imageUrl })
    },
    {
      accessorKey: 'cardmarketPrice',
      header: ({ column }) => sortableHeader(t('wantedCard.columns.cardmarketPrice'), column),
      cell: ({ row }) => {
        if (row.getIsGrouped() || row.original.cardmarketPrice === null) return null
        return `${row.original.cardmarketPrice.toFixed(2)} €`
      }
    },
    {
      accessorKey: 'cardtraderPrice',
      header: ({ column }) => sortableHeader(t('wantedCard.columns.cardtraderPrice'), column),
      cell: ({ row }) => {
        if (row.getIsGrouped() || row.original.cardtraderPrice === null) return null
        return `${row.original.cardtraderPrice.toFixed(2)} €`
      }
    },
    {
      accessorKey: 'copies',
      header: ({ column }) => sortableHeader(t('wantedCard.columns.copies'), column),
      cell: ({ row }) => row.getIsGrouped() ? null : row.original.copies
    },
    {
      accessorKey: 'language',
      header: ({ column }) => sortableHeader(t('wantedCard.columns.language'), column),
      cell: ({ row }) => {
        if (row.getIsGrouped()) return null
        const language = row.original.language || 'any'
        const icon = language === 'any' ? ICONS.languages : WANTED_CARD_LANGUAGE_ICONS[language]
        return h('div', { class: 'flex items-center gap-1.5' }, [
          h(UIcon, { name: icon, class: 'size-4 shrink-0' }),
          t(`wantedCard.languages.${language}`)
        ])
      }
    },
    {
      accessorKey: 'treatment',
      header: t('wantedCard.columns.treatment'),
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h('div', { class: 'flex flex-wrap gap-1' },
          row.original.treatment.map(value =>
            h(UBadge, { key: value, color: 'neutral', variant: 'subtle', size: 'sm' }, () => t(`wantedCard.treatments.${value}`)))
        )
    },
    {
      accessorKey: 'date',
      header: ({ column }) => sortableHeader(t('wantedCard.columns.date'), column),
      cell: ({ row }) => row.getIsGrouped() || !row.original.date
        ? null
        : h(DateWithRelativeTooltip, { isoString: row.original.date, time: false })
    },
    {
      accessorKey: 'status',
      header: ({ column }) => sortableHeader(t('wantedCard.columns.status'), column),
      cell: ({ row }) => {
        if (row.getIsGrouped()) return null
        return h(UBadge, {
          color: wantedCardStatusColor(row.original.status),
          variant: 'subtle'
        }, () => t(`wantedCard.status.${row.original.status}`))
      }
    },
    {
      accessorKey: 'notes',
      header: t('wantedCard.columns.notes'),
      meta: { class: { td: 'text-muted max-w-64 whitespace-normal break-words' } },
      cell: ({ row }) => row.getIsGrouped() ? null : row.original.notes
    },
    {
      accessorKey: 'createdBy',
      header: t('wantedCard.columns.createdBy'),
      cell: ({ row }) => auditAssociateCell(row.getIsGrouped(), row.original.createdBy)
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => sortableHeader(t('wantedCard.columns.createdAt'), column),
      meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h(DateWithRelativeTooltip, { isoString: row.original.createdAt })
    },
    {
      accessorKey: 'updatedBy',
      header: t('wantedCard.columns.updatedBy'),
      cell: ({ row }) => auditAssociateCell(row.getIsGrouped(), row.original.updatedBy)
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => sortableHeader(t('wantedCard.columns.updatedAt'), column),
      meta: { class: { th: 'whitespace-nowrap', td: 'whitespace-nowrap font-mono' } },
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h(DateWithRelativeTooltip, { isoString: row.original.updatedAt })
    },
    {
      id: 'actions',
      header: t('wantedCard.columns.actions'),
      // Visible actions column (2026-08-18), matching leagues/locations/
      // tournaments' convention — same items the right-click context menu
      // already shows (rowContextMenuItems), just also reachable without
      // knowing to right-click. null on a grouped (player-header) row, same
      // as every other cell here — there's no single card to act on.
      cell: ({ row }) => row.getIsGrouped()
        ? null
        : h(RowActionsMenu, { items: rowContextMenuItems(row.original) })
    }
  ]

  return { columns, columnHeaders }
}
