// app\composables\cittadino\useCittadinoTableColumns.ts
import { h } from 'vue'
import type { Ref } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { CittadinoEvent, CittadinoStanding } from '~/types'
import AssociateTag from '~/components/ui/AssociateTag.vue'

// Column widths are declared twice on purpose: `size` feeds TanStack's
// getStart('left')/getAfter('right') (UTable's pinned column offsets) while the w-[…] class is what
// renders. They must agree or frozen columns overlap the scrolling ones.
const POSITION_WIDTH = 56
const PLAYER_WIDTH = 180
const EVENT_WIDTH = 46
const TOTAL_WIDTH = 76

// "2026-03-21" -> "21/03": the day/month chip above each event name
function formatEventDate(date: string) {
  const [, month, day] = date.split('-')
  return `${day}/${month}`
}

// Direct import from #components rather than resolveComponent() (see CLAUDE.md: it only works in a
// .vue <script setup>). The hover crosshair (row and column) is PublicMatrixTable's job via DOM
// event delegation: `meta.class.td` looked reactive but wasn't.
export function useCittadinoTableColumns(events: Ref<CittadinoEvent[]>, search?: Ref<string>) {
  const { t } = useI18n()
  const { formatColor, formatColorClass } = useFormatColor()

  // TanStack positions a pinned column at the sum of the preceding `size` values, but the browser
  // lays out the cell from its own content and padding: any mismatch makes the next pinned column
  // land short and lets scrolling rows show through. Locking min/max width and cutting the theme's
  // p-4 padding keeps the rendered width equal to `size`.
  //
  // Literals rather than built from the *_WIDTH constants: Tailwind only generates complete class
  // strings, so an interpolated `w-[${n}px]` would never exist. Keep in sync with the constants
  // above.
  const POSITION_CLASS = 'w-[56px] min-w-[56px] max-w-[56px] px-2'
  const PLAYER_CLASS = 'w-[180px] min-w-[180px] max-w-[180px] px-2'
  const COMPACT_CLASS = 'w-[60px] min-w-[60px] max-w-[60px] px-2'
  const EVENT_CLASS = 'w-[46px] min-w-[46px] max-w-[46px] p-0'
  const TOTAL_CLASS = 'w-[76px] min-w-[76px] max-w-[76px] px-2'

  const columns = computed<TableColumn<CittadinoStanding>[]>(() => [
    {
      accessorKey: 'position',
      size: POSITION_WIDTH,
      header: () => h('span', { class: 'text-xs' }, t('cittadino.columns.position')),
      meta: { class: { th: POSITION_CLASS, td: `${POSITION_CLASS} tabular-nums` } },
      // The top 16 qualify for the final (regulation §4), the main thing readers look for: the one
      // emphasis the identity columns carry
      cell: ({ row }) => h('span', {
        class: row.original.position <= CITTADINO_FINALISTS
          ? 'font-semibold text-highlighted'
          : 'text-muted'
      }, String(row.original.position))
    },
    {
      accessorKey: 'playerName',
      size: PLAYER_WIDTH,
      header: () => h('span', { class: 'text-xs' }, t('cittadino.columns.player')),
      meta: { class: { th: PLAYER_CLASS, td: PLAYER_CLASS } },
      cell: ({ row }) => h(AssociateTag, {
        name: row.original.playerName, highlightQuery: search?.value
      })
    },
    {
      accessorKey: 'eventsPlayed',
      size: 60,
      header: () => h('span', {
        class: 'text-xs',
        title: t('cittadino.columns.eventsPlayedFull')
      }, t('cittadino.columns.eventsPlayed')),
      meta: { class: { th: COMPACT_CLASS, td: `${COMPACT_CLASS} tabular-nums text-muted` } },
      cell: ({ row }) => String(row.original.eventsPlayed)
    },
    {
      accessorKey: 'bestSingle',
      size: 60,
      header: () => h('span', {
        class: 'text-xs',
        title: t('cittadino.columns.bestSingleFull')
      }, t('cittadino.columns.bestSingle')),
      meta: { class: { th: COMPACT_CLASS, td: `${COMPACT_CLASS} tabular-nums text-muted` } },
      cell: ({ row }) => String(row.original.bestSingle)
    },

    // One narrow column per event: the matrix itself. The header has a day/month chip plus the
    // event name rotated to read bottom-up: at 46px per column rotating lets "Casual Commander #1"
    // fit without widening the grid
    ...events.value.map<TableColumn<CittadinoStanding>>(event => ({
      id: event.uuid,
      size: EVENT_WIDTH,
      header: () => h('div', {
        class: 'flex flex-col items-center gap-2 px-1 pb-1',
        title: `${event.name} · ${formatEventDate(event.date)}`
      }, [
        // In vertical writing mode the inline axis is vertical, so max-height caps the text run and
        // forces a wrap sideways, into the spare column width (otherwise "Draft Innistrad
        // Remastered" alone sets the header height). text-start, not centered: after the 180°
        // rotation the inline start is the bottom edge, so every name starts flush against its date
        // chip on one baseline
        h('span', {
          class: 'max-h-24 text-start text-xs font-normal leading-tight text-default [writing-mode:vertical-rl] rotate-180'
        }, event.name),
        // Date chip last so it sits at the bottom of the bottom-aligned header, keeping chips on
        // one line across columns. Its tint encodes the format, so a league's legs read as a block
        // across the calendar
        h('span', {
          class: [
            'rounded px-1 py-1 text-[10px] leading-none tabular-nums',
            formatColorClass(event.format)
          ],
          // formatColorClass only supplies bg-primary/15 text-primary, which read --ui-primary (not
          // overridden here), so every chip rendered the ambient primary colour instead of its
          // format's (same fix as FormatBadge.vue's colorStyle)
          style: formatColor(event.format) ? { '--ui-primary': formatColor(event.format) } : undefined
        }, formatEventDate(event.date))
      ]),
      meta: { class: { th: EVENT_CLASS, td: `${EVENT_CLASS} tabular-nums` } },
      cell: ({ row }) => {
        const result = row.original.resultsByEvent[event.uuid]

        const content = result
          // Dropped results stay visible so a reader can see why results don't add up to the total.
          // Parentheses, not a strikethrough: most cells hold a single digit, and a line through
          // "1" is unreadable at this width
          ? h('span', {
            class: result.counted ? 'font-medium text-highlighted' : 'text-dimmed',
            title: t(result.counted ? 'cittadino.cell.counted' : 'cittadino.cell.dropped', {
              event: event.name,
              rank: result.rank,
              points: result.points
            })
          }, result.counted ? String(result.points) : `(${result.points})`)
          : h('span', {
            class: 'text-dimmed',
            title: t('cittadino.cell.absent', { event: event.name })
          }, '·')

        // h-full/w-full: the td has p-0, so this wrapper must fill the cell or the content shrinks
        // to the digit
        return h('div', {
          class: 'flex h-full w-full items-center justify-center px-1 py-1.5'
        }, [content])
      }
    })),

    {
      accessorKey: 'total',
      size: TOTAL_WIDTH,
      header: () => h('span', { class: 'text-xs' }, t('cittadino.columns.total')),
      meta: { class: { th: TOTAL_CLASS, td: `${TOTAL_CLASS} tabular-nums font-semibold text-highlighted` } },
      cell: ({ row }) => String(row.original.total)
    }
  ])

  // Keyed by event uuid (the id the event columns use): PublicMatrixTable tints a hovered event
  // column's crosshair with its format colour
  const columnAccentColors = computed<Record<string, string>>(() =>
    Object.fromEntries(
      events.value
        .map(event => [event.uuid, formatColor(event.format)] as const)
        .filter((entry): entry is [string, string] => entry[1] !== undefined)
    ))

  return { columns, columnAccentColors }
}
