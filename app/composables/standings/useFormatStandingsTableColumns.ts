// app\composables\standings\useFormatStandingsTableColumns.ts
import { h } from 'vue'
import type { Ref } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { FormatStandingEvent, FormatStandingRow } from '~/types'
import AssociateTag from '~/components/ui/AssociateTag.vue'

// Same pinned-column shape as useCittadinoTableColumns.ts (position/playerName
// left, total right) — see the note there on why `size` and the w-[…] class are
// declared twice. Shared by every /standings/<format> page.
const POSITION_WIDTH = 56
const PLAYER_WIDTH = 180
const EVENT_WIDTH = 64
const TOTAL_WIDTH = 76

function formatEventDate(date: string) {
  const [, month, day] = date.split('-')
  return `${day}/${month}`
}

export function useFormatStandingsTableColumns(
  events: Ref<FormatStandingEvent[]>,
  topCutoff: Ref<number>,
  search?: Ref<string>
) {
  const { t } = useI18n()

  const POSITION_CLASS = 'w-[56px] min-w-[56px] max-w-[56px] px-2'
  const PLAYER_CLASS = 'w-[180px] min-w-[180px] max-w-[180px] px-2'
  const EVENT_CLASS = 'w-[64px] min-w-[64px] max-w-[64px] px-1'
  const TOTAL_CLASS = 'w-[76px] min-w-[76px] max-w-[76px] px-2'

  const columns = computed<TableColumn<FormatStandingRow>[]>(() => [
    {
      accessorKey: 'position',
      size: POSITION_WIDTH,
      header: () => h('span', { class: 'text-xs' }, t('standings.columns.position')),
      meta: { class: { th: POSITION_CLASS, td: `${POSITION_CLASS} tabular-nums` } },
      cell: ({ row }) => h('span', {
        class: row.original.position <= topCutoff.value
          ? 'font-semibold text-highlighted'
          : 'text-muted'
      }, String(row.original.position))
    },
    {
      accessorKey: 'playerName',
      size: PLAYER_WIDTH,
      header: () => h('span', { class: 'text-xs' }, t('standings.columns.player')),
      meta: { class: { th: PLAYER_CLASS, td: PLAYER_CLASS } },
      cell: ({ row }) => h(AssociateTag, {
        name: row.original.playerName, highlightQuery: search?.value
      })
    },

    ...events.value.map<TableColumn<FormatStandingRow>>(event => ({
      id: event.uuid,
      size: EVENT_WIDTH,
      header: () => h('div', {
        class: 'flex flex-col items-center gap-1',
        title: `${event.name} · ${formatEventDate(event.date)}`
      }, [
        h('span', { class: 'text-xs font-normal text-default' }, formatEventDate(event.date))
      ]),
      meta: { class: { th: EVENT_CLASS, td: `${EVENT_CLASS} tabular-nums text-center` } },
      cell: ({ row }) => {
        const result = row.original.resultsByEvent[event.uuid]
        if (!result) return h('span', { class: 'text-dimmed' }, '·')

        // Dropped results stay visible in parentheses, same convention as the
        // Cittadino matrix — the point of showing every column is seeing why the
        // total doesn't add up to a plain sum. The participation point is shown
        // regardless of `counted`: it's flat and unconditional, unlike placement
        // points (see useFormatStandingsQuery.ts).
        return h('span', { class: 'inline-flex items-baseline gap-0.5' }, [
          h('span', {
            class: result.counted ? 'font-medium text-highlighted' : 'text-dimmed'
          }, result.counted ? String(result.points) : `(${result.points})`),
          result.participationPoints > 0
            ? h('span', { class: 'text-[10px] text-dimmed' }, `+${result.participationPoints}`)
            : null
        ])
      }
    })),

    {
      accessorKey: 'total',
      size: TOTAL_WIDTH,
      header: () => h('span', { class: 'text-xs' }, t('standings.columns.total')),
      meta: { class: { th: TOTAL_CLASS, td: `${TOTAL_CLASS} tabular-nums font-semibold text-highlighted` } },
      cell: ({ row }) => String(row.original.total)
    }
  ])

  return { columns }
}
