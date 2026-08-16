// app\composables\cittadino\useCittadinoTableColumns.ts
import { h } from 'vue'
import type { Ref } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { CittadinoEvent, CittadinoStanding } from '~/types'
import PlayerTag from '~/components/ui/PlayerTag.vue'

// Column widths are declared twice on purpose: `size` feeds TanStack's
// getStart('left')/getAfter('right'), which is how UTable computes the offset of
// pinned columns, while the w-[…] class is what actually renders. They must agree
// or the frozen columns overlap the scrolling ones.
const POSITION_WIDTH = 56
const PLAYER_WIDTH = 180
const EVENT_WIDTH = 46
const TOTAL_WIDTH = 76

// "2026-03-21" -> "21/03" — the day/month chip above each event name.
function formatEventDate(date: string) {
  const [, month, day] = date.split('-')
  return `${day}/${month}`
}

// Direct import from #components rather than resolveComponent() — see the note in
// CLAUDE.md: resolveComponent only works inside a .vue <script setup>.
//
// The hover crosshair (both row and column) is PublicMatrixTable's own
// responsibility now — DOM event delegation there, not per-cell state here. See
// its source for why: `meta.class.td` looked reactive but wasn't.
export function useCittadinoTableColumns(events: Ref<CittadinoEvent[]>) {
  const { t } = useI18n()

  // A pinned column is positioned by TanStack at the sum of the preceding `size`
  // values, but the browser lays the cell out from its own content and padding —
  // if the two disagree even slightly, the next pinned column lands short and the
  // scrolling rows show through the sliver between them. Locking min/max width and
  // taking the padding down from the theme's p-4 keeps the rendered width exactly
  // equal to the declared `size`.
  //
  // Written out as literals rather than built from the *_WIDTH constants: Tailwind
  // scans source for complete class strings, so an interpolated `w-[${n}px]` would
  // never be generated. Keep these in sync with the constants above.
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
      // The top 16 qualify for the final (regulation §4), which is the single
      // thing most readers are looking for — so the cutoff is the one piece of
      // emphasis the identity columns carry.
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
      cell: ({ row }) => h(PlayerTag, { name: row.original.playerName })
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

    // One narrow column per event — the matrix itself. The header carries a
    // day/month chip plus the full event name rotated to read bottom-up: at 46px
    // per column an abbreviation would be the only horizontal option, and rotating
    // is what lets "Casual Commander #1" fit without widening the grid.
    ...events.value.map<TableColumn<CittadinoStanding>>(event => ({
      id: event.uuid,
      size: EVENT_WIDTH,
      header: () => h('div', {
        class: 'flex flex-col items-center gap-2 px-1 pb-1',
        title: `${event.name} · ${formatEventDate(event.date)}`
      }, [
        // In vertical writing mode the inline axis is vertical, so max-height is
        // what caps the text run and forces a wrap — the extra line then stacks
        // sideways, into the column width there is room to spare in. Without the
        // cap, "Draft Innistrad Remastered" alone sets the header height.
        // text-start, not centered: after the 180° rotation the inline start is the
        // bottom edge, so every name begins flush against its date chip and the
        // whole row of labels shares one baseline instead of floating.
        h('span', {
          class: 'max-h-24 text-start text-xs font-normal leading-tight text-default [writing-mode:vertical-rl] rotate-180'
        }, event.name),
        // Date chip last so it sits at the bottom of the bottom-aligned header:
        // that keeps the chips on one line across all columns instead of
        // staggering them by event-name length. Its tint encodes the format, so
        // the legs of each league read as a block across the calendar.
        h('span', {
          class: [
            'rounded px-1 py-1 text-[10px] leading-none tabular-nums',
            formatColorClass(event.format)
          ]
        }, formatEventDate(event.date))
      ]),
      meta: { class: { th: EVENT_CLASS, td: `${EVENT_CLASS} tabular-nums` } },
      cell: ({ row }) => {
        const result = row.original.resultsByEvent[event.uuid]

        const content = result
          // Dropped results stay visible: the point of showing the whole matrix is
          // that a reader can see why a player's results don't add up to the total.
          // Parentheses rather than a strikethrough — most cells hold a single
          // digit, and a line through "1" is unreadable at this column width.
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

        // h-full/w-full matter: the td has p-0 so this wrapper fills the cell,
        // otherwise the content shrinks to the digit and leaves dead space around it.
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

  // Keyed by event uuid, same id the event columns above are given — read by
  // PublicMatrixTable to tint a hovered event column's crosshair toward its
  // format's colour instead of the default neutral highlight.
  const columnAccentColors = computed<Record<string, string>>(() =>
    Object.fromEntries(
      events.value
        .map(event => [event.uuid, formatColor(event.format)] as const)
        .filter((entry): entry is [string, string] => entry[1] !== undefined)
    ))

  return { columns, columnAccentColors }
}
