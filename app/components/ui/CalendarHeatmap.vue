<!-- app\components\ui\CalendarHeatmap.vue -->
<!--
  GitHub-style contribution calendar (2026-08-20, extracted out of
  players/[slug].vue's login-history section the moment it stopped being a
  one-off — day-of-week rows on the left, month labels above the columns
  they start in, weeks as columns). Hand-built with a Tailwind grid, not
  ECharts (already installed/configured elsewhere in this app) — its SVG
  renderer doesn't reliably resolve CSS var()/color-mix() the way real CSS
  properties do (confirmed via claude-in-chrome: swatches rendered flat
  black), and a calendar this size doesn't need a charting library at all.
  bg-primary at increasing opacity per bucket — theme-integrated for free.
-->
<script setup lang="ts">
import { sub } from 'date-fns'

interface HeatmapDay {
  date: string
  count: number
  // Raw timestamps for this day, in the order they were passed in — shown in
  // the tooltip (user request, 2026-08-20) instead of just the count, so the
  // per-login-time detail that used to live only in the flat list below the
  // chart is available here too.
  times: string[]
}

interface LegendLabelKeys {
  none: string
  low: string
  mediumLow: string
  mediumHigh: string
  high: string
}

interface DayVariant {
  class: string
  labelKey: string
}

const {
  dates,
  months = 12,
  spanDates = false,
  countLabelKey = 'common.calendarHeatmap.accessCount',
  legendLabelKeys = {
    none: 'common.calendarHeatmap.none',
    low: 'common.calendarHeatmap.low',
    mediumLow: 'common.calendarHeatmap.mediumLow',
    mediumHigh: 'common.calendarHeatmap.mediumHigh',
    high: 'common.calendarHeatmap.high'
  },
  variantByDate,
  legendItems,
  highlightedDate = null
} = defineProps<{
  /** One ISO date/timestamp string per event (e.g. a login) — same day repeated is counted, not deduped. */
  dates: string[]
  /** How many trailing months the grid covers, ending today. Ignored when spanDates is true. @default 12 */
  months?: number
  /**
   * Spans the grid from the earliest to the latest date in `dates` instead
   * of the default "trailing N months ending today" — needed wherever the
   * events themselves can be scheduled in the future (a league's tournaments
   * span months that haven't happened yet, unlike logins which are always in
   * the past). @default false
   */
  spanDates?: boolean
  /** i18n key for the pluralized "N <events>" tooltip/aria-label line — e.g. "{count} accesso | {count} accessi". Swap this per domain (logins vs. tournaments, ...) rather than hardcoding "accesso/accessi" here. */
  countLabelKey?: string
  /** i18n keys for the 5 legend swatch labels ("Nessun accesso" etc.) — same per-domain override as countLabelKey. */
  legendLabelKeys?: LegendLabelKeys
  /**
   * Per-day color/label override, keyed by the same yyyy-MM-dd produced by
   * toLocalDateKey() (app/utils/dateTime.ts) — build the keys with that same
   * helper so they actually match. For domains where "how many events that
   * day" isn't the meaningful axis (e.g. a league rarely runs more than one
   * tournament a day — count-based intensity collapses to none/high and says
   * nothing) but a categorical state does (tournament status). Falls back to
   * the count-based level for any day without an entry.
   */
  variantByDate?: Record<string, DayVariant>
  /**
   * Replaces the built-in "Meno ... Più" gradient legend outright — pass
   * this alongside variantByDate, since a status legend ("Bozza",
   * "Completato", ...) has nothing to do with intensity.
   */
  legendItems?: DayVariant[]
  /**
   * Externally-driven highlight, keyed the same way as variantByDate — the
   * reverse direction of hoveredDate: hovering something else on the page
   * that shares this heatmap's dates (e.g. a tournament card) rings the
   * matching cell here, independent of this component's own pointer state.
   */
  highlightedDate?: string | null
}>()

const weeks = computed<HeatmapDay[][]>(() => {
  const timesByDay = new Map<string, string[]>()
  for (const iso of dates) {
    const day = toLocalDateKey(new Date(iso))
    const times = timesByDay.get(day) ?? []
    times.push(iso)
    timesByDay.set(day, times)
  }

  let end: Date
  let start: Date
  if (spanDates && dates.length) {
    const sorted = [...dates].sort()
    start = new Date(sorted[0]!)
    end = new Date(sorted[sorted.length - 1]!)
  } else {
    end = new Date()
    start = sub(end, { months })
  }

  // Normalized to local midnight — `start`/`end` above keep whatever exact
  // time-of-day their source ISO string had (e.g. a tournament's starts_at).
  // The loop below only cares about calendar days, so comparing full
  // timestamps was an off-by-one waiting to happen: if the *last* day's
  // source time was earlier in the day than the *first* day's (which
  // `cursor` inherits via setDate(), see gridStart below), `cursor` on the
  // final iteration ended up later than `end` and got excluded. Confirmed
  // 2026-08-22, issue #42.
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  // Grid columns are full weeks (Monday-first) — back up `start` to the
  // most recent Monday on/before it so the first column isn't partial.
  const mondayOffset = (start.getDay() + 6) % 7
  const gridStart = new Date(start)
  gridStart.setDate(gridStart.getDate() - mondayOffset)

  const days: HeatmapDay[] = []
  for (const cursor = new Date(gridStart); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const date = toLocalDateKey(cursor)
    // Newest first (user request, 2026-08-20) — the most recent login on a
    // given day is the one worth seeing without scrolling the tooltip.
    const times = (timesByDay.get(date) ?? []).sort().reverse()
    days.push({ date, count: times.length, times })
  }

  const result: HeatmapDay[][] = []
  for (let i = 0; i < days.length; i += 7) {
    result.push(days.slice(i, i + 7))
  }
  return result
})

const maxCount = computed(() => Math.max(1, ...weeks.value.flat().map(day => day.count)))

const { t } = useI18n()

// Single source for both the cells and the "Meno ... Più" legend below (user
// request, 2026-08-20, "like GitHub") — same 5 buckets either way, in order,
// so they can never drift apart.
const LEVELS = computed(() => [
  { threshold: 0, class: 'bg-elevated', labelKey: legendLabelKeys.none },
  { threshold: 0.25, class: 'bg-primary/20', labelKey: legendLabelKeys.low },
  { threshold: 0.5, class: 'bg-primary/40', labelKey: legendLabelKeys.mediumLow },
  { threshold: 0.75, class: 'bg-primary/70', labelKey: legendLabelKeys.mediumHigh },
  { threshold: 1, class: 'bg-primary', labelKey: legendLabelKeys.high }
])

function levelFor(count: number) {
  if (count === 0) return LEVELS.value[0]!
  const ratio = count / maxCount.value
  // Each level's own threshold is the ratio that promotes you to the *next*
  // level (LEVELS[1].threshold = 0.25 is where "low" gives way to
  // "mediumLow", etc.) — walk down from the top so the first level whose
  // predecessor's threshold the ratio clears wins.
  for (let i = LEVELS.value.length - 1; i >= 1; i--) {
    if (ratio > LEVELS.value[i - 1]!.threshold) return LEVELS.value[i]!
  }
  return LEVELS.value[1]!
}

function cellClass(day: HeatmapDay): string {
  return variantByDate?.[day.date]?.class ?? levelFor(day.count).class
}

// Same day.date used as accessorKey and iso-string prop elsewhere in this
// app — parsed fresh here since HeatmapDay only stores the raw yyyy-MM-dd.
const cellDateFormatter = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
function cellDateLabel(date: string): string {
  return cellDateFormatter.format(new Date(date))
}

const cellTimeFormatter = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' })
function cellTimeLabel(iso: string): string {
  return cellTimeFormatter.format(new Date(iso))
}

// Labels the column where a new month starts, same convention as GitHub's
// own graph (not every column, just the first one of each month) — Italian
// short form, matching this app's Italian-only UI copy.
const monthFormatter = new Intl.DateTimeFormat('it-IT', { month: 'short' })
const monthLabels = computed(() => {
  let lastMonth = -1
  return weeks.value.map((week) => {
    const firstDay = new Date(week[0]!.date)
    if (firstDay.getMonth() === lastMonth) return ''
    lastMonth = firstDay.getMonth()
    return monthFormatter.format(firstDay)
  })
})

const dayFormatter = new Intl.DateTimeFormat('it-IT', { weekday: 'short' })
const referenceMonday = new Date()
referenceMonday.setDate(referenceMonday.getDate() - referenceMonday.getDay() + 1)
const dayLabels = [0, 1, 2, 3, 4, 5, 6].map((offset) => {
  const day = new Date(referenceMonday)
  day.setDate(day.getDate() + offset)
  return dayFormatter.format(day)
})

// One shared, pointer-following UTooltip instead of a UPopover per cell
// (373+ instances for a 12-month grid) — same virtual :reference technique
// as CardHoverPreview.vue, needed here for the same reason: mounting a real
// tooltip/popover component per cell is expensive at this count and was
// visibly janky. A single tooltip anchored to the pointer position, with its
// content swapped on hover, costs nothing per cell.
const tooltipOpen = ref(false)
const { anchor, reference } = usePointerReference()
const hoveredDay = ref<HeatmapDay | null>(null)

// Exposes which day is currently hovered/focused, keyed the same way as
// variantByDate — lets a caller (e.g. leagues/[leagueId]/index.vue) cross-
// highlight something else on the page that shares the same date, without
// this component needing to know what that something else is.
const hoveredDate = defineModel<string | null>('hoveredDate', { default: null })
watch(hoveredDay, day => (hoveredDate.value = day?.date ?? null))

function handlePointerEnter(day: HeatmapDay, ev: PointerEvent) {
  hoveredDay.value = day
  anchor.value = { x: ev.clientX, y: ev.clientY }
  tooltipOpen.value = true
}

// Keyboard/screen-reader path (2026-08-20) — cells were pointer-only, so
// tabbing through the grid exposed nothing. Anchors the same shared tooltip
// to the focused cell's own rect instead of a pointer position.
function handleFocus(day: HeatmapDay, ev: FocusEvent) {
  hoveredDay.value = day
  const rect = (ev.target as HTMLElement).getBoundingClientRect()
  anchor.value = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  tooltipOpen.value = true
}

function handlePointerLeave() {
  tooltipOpen.value = false
  hoveredDay.value = null
}

function cellAriaLabel(day: HeatmapDay): string {
  const variantLabel = variantByDate?.[day.date]
  const status = variantLabel ? t(variantLabel.labelKey) : t(countLabelKey, day.count)
  return `${cellDateLabel(day.date)}: ${status}`
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <!-- Single shared tooltip wraps the whole grid (see the script comment
         above tooltipOpen) — its :reference is overridden per-cell via the
         pointer handlers below, same technique as CardHoverPreview.vue. -->
    <UTooltip
      v-model:open="tooltipOpen"
      :arrow="false"
      :reference="reference"
      :content="{ align: 'start', side: 'right', sideOffset: 10, updatePositionStrategy: 'always' }"
      :ui="{ content: 'bg-transparent border-0 shadow-none p-0' }"
    >
      <div class="flex gap-2 overflow-x-auto">
        <!-- Mirrors the sibling column's own two-row structure (a month-label
             row, then the week grid) with a matching placeholder + gap-2,
             instead of a hand-tuned margin-top — a fixed margin drifts out of
             sync the moment that column's own gap/row-height changes
             (confirmed 2026-08-20: exactly this happened after the month-row
             gap was bumped to gap-2, leaving the weekday labels 4px too
             high). -->
        <div class="flex flex-col gap-2 text-xs text-muted shrink-0">
          <div class="h-4" />
          <div class="flex flex-col gap-1">
            <div v-for="(label, index) in dayLabels" :key="index" class="h-3 leading-3">
              {{ label }}
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex gap-1">
            <div v-for="(label, index) in monthLabels" :key="index" class="w-3 text-xs text-muted shrink-0">
              {{ label }}
            </div>
          </div>

          <div class="flex gap-1">
            <div
              v-for="(week, weekIndex) in weeks"
              :key="weekIndex"
              class="flex flex-col gap-1"
            >
              <div
                v-for="day in week"
                :key="day.date"
                tabindex="0"
                role="img"
                :aria-label="cellAriaLabel(day)"
                class="size-3 rounded-sm cursor-default focus-visible:outline focus-visible:outline-primary"
                :class="[cellClass(day), { 'ring-2 ring-primary': day.date === highlightedDate }]"
                @pointerenter="handlePointerEnter(day, $event)"
                @pointerleave="handlePointerLeave"
                @focus="handleFocus(day, $event)"
                @blur="handlePointerLeave"
              />
            </div>
          </div>

          <!-- Below the grid, right-aligned to it specifically (user
               request, 2026-08-20, "like github") — lives inside this same
               fixed-to-content-width column, not the outer card, so on a
               wide page it stays under the grid's own right edge instead of
               drifting out to the card's. Two different legend shapes: the
               default "Meno ... Più" intensity gradient (count-based
               domains, e.g. logins), or a flat list of labeled swatches when
               legendItems is passed (categorical domains, e.g. tournament
               status — "how many that day" isn't the meaningful axis there). -->
          <div v-if="legendItems" class="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 pr-8 text-xs text-muted">
            <span v-for="item in legendItems" :key="item.labelKey" class="flex items-center gap-1.5">
              <span class="size-3 rounded-sm shrink-0" :class="item.class" />
              {{ t(item.labelKey) }}
            </span>
          </div>
          <div v-else class="flex items-center justify-end gap-1 pr-8 text-xs text-muted">
            <span>{{ t('common.calendarHeatmap.less') }}</span>
            <div
              v-for="level in LEVELS"
              :key="level.labelKey"
              class="size-3 rounded-sm"
              :class="level.class"
              :title="t(level.labelKey)"
            />
            <span>{{ t('common.calendarHeatmap.more') }}</span>
          </div>
        </div>
      </div>

      <template v-if="hoveredDay" #content>
        <div class="p-3 space-y-1 text-sm min-w-40 bg-default rounded-lg shadow-lg ring ring-default">
          <p class="font-medium text-highlighted">
            {{ cellDateLabel(hoveredDay.date) }}
          </p>
          <p v-if="variantByDate?.[hoveredDay.date]" class="text-muted">
            {{ t(variantByDate[hoveredDay.date]!.labelKey) }}
          </p>
          <p v-else-if="!hoveredDay.times.length" class="text-muted">
            {{ t(countLabelKey, 0) }}
          </p>
          <template v-else>
            <p v-for="(time, index) in hoveredDay.times" :key="index" class="text-muted">
              {{ cellTimeLabel(time) }}
            </p>
          </template>
        </div>
      </template>
    </UTooltip>
  </div>
</template>
