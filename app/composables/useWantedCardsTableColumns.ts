// app\composables\useWantedCardsTableColumns.ts
import { h } from 'vue'
import { UBadge, UIcon } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { WantedCard } from '~/types'
import ManaCost from '~/components/magic/ManaCost.vue'
import CardPreviewTooltip from '~/components/magic/CardPreviewTooltip.vue'
import PlayerTag from '~/components/PlayerTag.vue'

// Pure config (depends only on t()) — extracted from the page to isolate the ~110
// lines of column definitions from the rest of the view's logic.
// Direct import from #components instead of resolveComponent(): the latter only
// works reliably inside a .vue file's <script setup> block (where the compiler
// rewrites it), not from a plain .ts file — used here it caused "Failed to resolve
// component" at runtime.
export function useWantedCardsTableColumns() {
  const { t } = useI18n()

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
    notes: t('wantedCard.columns.notes')
  }

  const columns: TableColumn<WantedCard>[] = [
    {
      accessorKey: 'player',
      header: ({ column }) => sortableHeader(t('wantedCard.columns.player'), column),
      // Sorts groups by number of requests (subRows), not alphabetically by name —
      // that is what is actually useful when the table is grouped.
      sortingFn: (rowA, rowB) => (rowA.subRows?.length ?? 0) - (rowB.subRows?.length ?? 0),
      cell: ({ row, getValue }) => {
        if (!row.getIsGrouped()) return h(PlayerTag, { name: getValue<string>() })
        return h('button', {
          type: 'button',
          class: 'flex items-center gap-1.5 font-medium cursor-pointer',
          onClick: () => row.toggleExpanded()
        }, [
          h(UIcon, {
            name: row.getIsExpanded() ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right',
            class: 'size-4'
          }),
          h(PlayerTag, { name: getValue<string>() }),
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
        return h('div', { class: 'flex items-center gap-1.5' }, [
          h(UIcon, { name: WANTED_CARD_LANGUAGE_ICONS[language] ?? 'i-lucide-languages', class: 'size-4 shrink-0' }),
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
      cell: ({ row }) => row.getIsGrouped() ? null : row.original.date
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
    }
  ]

  return { columns, columnHeaders }
}
