<!-- app\components\public\PublicCalendarPage.vue -->
<!--
  Public (no auth) counterpart to pages/(competitions)/events/index.vue,
  backing calendario.pauperwave.org (settings/domains.vue, renamed from
  eventi. 2026-08-14), mounted at /calendario
  (app/pages/(public)/calendario/index.vue) — not /events (the internal
  dashboard route) and not /calendar (a distinct, unrelated in-development
  dashboard page, see shared/utils/publicHosts.ts). Cards are not
  clickable — GridView.vue links to /events/<id>, the internal dashboard
  detail page, which would just bounce an anonymous visitor to /login. The
  internal dashboard page is untouched.

  Built around a mixed timeline of Events and Tournaments, per user
  clarification: most calendar items are standalone tournaments (e.g. a
  single Draft night is just a Tournament with format "draft"), not an
  "Evento" — an Event only shows up here as a grouping card when at least
  one Tournament actually links it (tournaments.event_uuid, matched by uuid);
  a bare Event with no linked tournaments doesn't appear at all. Rendering
  itself lives in calendar/card/Base.vue (shared shell) and its two variants,
  calendar/card/Event.vue / calendar/card/Tournament.vue — this component
  only builds and filters the `filteredCards` list.
-->
<script lang="ts" setup>
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { it } from 'date-fns/locale'
import { CalendarDate, getLocalTimeZone } from '@internationalized/date'
import type { Event, Tournament } from '~/types'

const { t } = useI18n()

useSeoMeta({
  title: () => t('event.seoTitle')
})

// Today/month-picker/city-filter row collapses to compact controls below sm
// (user request, 2026-08-30: "today month select and tabs of calendar are
// split in two lines" on mobile) — same breakpoint/composable as
// leagues/[leagueId]/index.vue's own isSideBySide.
const isCompact = useMediaQuery('(max-width: 639px)')

// Scoped to a single month at a time, per user request 2026-08-13 — unlike
// the dashboard grid (events/index.vue), which defaults to "all time". Starts
// on the current month; the picker below (UCalendar type="month", same
// @internationalized/date bridge as DateRangePicker.vue) jumps to another.
const selectedMonth = shallowRef(startOfMonth(new Date()))

const range = computed(() => ({
  start: startOfMonth(selectedMonth.value),
  end: endOfMonth(selectedMonth.value)
}))

const calendarMonthValue = computed({
  get: () => {
    const year = selectedMonth.value.getFullYear()
    const month = selectedMonth.value.getMonth() + 1
    return new CalendarDate(year, month, 1)
  },
  set: (value?: CalendarDate) => {
    if (!value) return
    selectedMonth.value = startOfMonth(value.toDate(getLocalTimeZone()))
  }
})

const { data: eventsData, isLoading: loadingEvents } = useEventsQuery()
const { data: tournamentsData, isLoading: loadingTournaments } = useTournamentsQuery()
const loading = computed(() => loadingEvents.value || loadingTournaments.value)

interface EventCard {
  kind: 'event'
  event: Event
  tournaments: Tournament[]
}
interface TournamentCard {
  kind: 'tournament'
  tournament: Tournament
}
type CalendarCardEntry = EventCard | TournamentCard

function cardDate(card: CalendarCardEntry): Date {
  return new Date(card.kind === 'event' ? card.event.startDate : card.tournament.startDate)
}

function cardCity(card: CalendarCardEntry): string | null {
  return card.kind === 'event' ? card.event.locationCity : card.tournament.locationCity
}

function cardKey(card: CalendarCardEntry): string {
  const id = card.kind === 'event' ? card.event.id : card.tournament.id
  return `${card.kind}-${id}`
}

const cards = computed<CalendarCardEntry[]>(() => {
  // Matched by uuid, not name (2026-08-15, both events and tournaments are
  // real now) — a name collision between two events can't misgroup a
  // tournament under the wrong one.
  const eventsByUuid = new Map((eventsData.value ?? []).map(event => [event.uuid, event]))
  const eventGroups = new Map<string, Tournament[]>()
  const standalone: Tournament[] = []

  for (const tournament of tournamentsData.value ?? []) {
    if (tournament.eventUuid) {
      const existing = eventGroups.get(tournament.eventUuid) ?? []
      eventGroups.set(tournament.eventUuid, [...existing, tournament])
    } else {
      standalone.push(tournament)
    }
  }

  const eventCards: CalendarCardEntry[] = [...eventGroups.entries()].flatMap(
    ([eventUuid, tournaments]) => {
      const event = eventsByUuid.get(eventUuid)
      return event ? [{ kind: 'event' as const, event, tournaments }] : []
    }
  )

  const tournamentCards: CalendarCardEntry[] = standalone.map(
    tournament => ({ kind: 'tournament' as const, tournament })
  )

  return [...eventCards, ...tournamentCards]
    .sort((a, b) => cardDate(a).getTime() - cardDate(b).getTime())
})

const monthCards = computed(() => cards.value.filter((card) => {
  const date = cardDate(card)
  return date >= range.value.start && date <= range.value.end
}))

// City filter (user request, 2026-08-29, "filter by Trento / Rovereto") —
// 'all' sentinel, not null, same convention as useTournamentsFilters.ts's
// own statusFilter/formatFilter. The option *list* is built from every known
// card (cards, not monthCards) so it doesn't flicker in and out as the user
// changes month — a month with only one active city would otherwise hide
// the control entirely. Counts stay scoped to monthCards so the badges match
// what's actually on screen; the "Tutte" tab gets no count badge
// (undefined), same as every other 'all' tab in the app.
const selectedCity = ref<'all' | string>('all')
const cityItems = computed(() => {
  const allCities = new Set<string>()
  for (const card of cards.value) {
    const city = cardCity(card)
    if (city) allCities.add(city)
  }
  const monthCounts = new Map<string, number>()
  for (const card of monthCards.value) {
    const city = cardCity(card)
    if (city) monthCounts.set(city, (monthCounts.get(city) ?? 0) + 1)
  }
  return [
    { label: t('event.calendarAllCities'), value: 'all' as const, count: undefined, disabled: false },
    // A city with no events in the selected month stays listed (see the
    // comment above the `cities` set) but disabled — user request,
    // 2026-08-30: don't hide it (that flickers the list per month) or leave
    // it clickable to an empty state, just make it unselectable until it
    // has something to show.
    ...[...allCities].sort((a, b) => a.localeCompare(b))
      .map((city) => {
        const count = monthCounts.get(city) ?? 0
        return { label: city, value: city, count, disabled: count === 0 }
      })
  ]
})

// If the selected city drops to 0 events after a month change, it just
// became disabled above — fall back to "Tutte" rather than leaving the
// control showing a disabled-but-selected city and an empty list.
watch(cityItems, (items) => {
  const selected = items.find(item => item.value === selectedCity.value)
  if (selected?.disabled) selectedCity.value = 'all'
})

const filteredCards = computed(() => selectedCity.value === 'all'
  ? monthCards.value
  : monthCards.value.filter(card => cardCity(card) === selectedCity.value))
</script>

<template>
  <div class="relative flex-1 flex flex-col gap-4 px-6 py-8 md:px-10">
    <h1 class="sr-only">
      {{ $t('event.breadcrumb') }}
    </h1>

    <!-- TODO there is a bug on mobile -->
    <LayoutColorModeSwitch class="absolute right-4 top-4 z-10 md:right-8 md:top-8" />

    <div class="flex justify-center">
      <div class="flex items-center gap-3">
        <img
          src="https://avatars.githubusercontent.com/u/225214755?s=200&v=4"
          alt="Pauperwave"
          class="size-10 rounded-full shrink-0"
        >
        <a
          href="https://blog.pauperwave.org"
          target="_blank"
          rel="noopener noreferrer"
          class="font-bold tracking-tight hover:underline"
        >
          Pauperwave
        </a>
      </div>
    </div>

    <div class="flex items-center justify-center gap-3">
      <div class="flex items-center gap-2">
        <UButton
          :icon="isCompact ? ICONS.calendarCheck : undefined"
          :label="isCompact ? undefined : t('event.calendarToday')"
          :aria-label="isCompact ? t('event.calendarToday') : undefined"
          color="neutral"
          variant="outline"
          @click="selectedMonth = startOfMonth(new Date())"
        />

        <div id="tour-calendar-month-picker">
          <UPopover>
            <UButton
              :label="format(selectedMonth, isCompact ? 'MMM yyyy' : 'MMMM yyyy', { locale: it })"
              class="capitalize"
              color="neutral"
              variant="outline"
              :trailing-icon="ICONS.chevronDown"
            />

            <template #content>
              <UCalendar
                v-model="calendarMonthValue"
                type="month"
                class="p-2"
              />
            </template>
          </UPopover>
        </div>
      </div>

      <!-- Only shown once there's an actual choice to make (Tutte + 2+ real
           cities) — a single-city month would just show a redundant "Tutte"
           button next to the only real option. Collapses to a compact
           select below sm instead of StatusFilterGroup's button row, which
           doesn't wrap internally and would push the whole row to two
           lines. -->
      <div v-if="cityItems.length > 2" id="tour-calendar-city-filter">
        <USelectMenu
          v-if="isCompact"
          :model-value="selectedCity"
          :items="cityItems"
          value-key="value"
          label-key="label"
          class="w-32"
          @update:model-value="selectedCity = $event ?? 'all'"
        />
        <StatusFilterGroup v-else v-model="selectedCity" :items="cityItems" />
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="animate-spin text-3xl text-muted" />
    </div>

    <div
      v-else-if="!filteredCards.length"
      class="text-center py-12 text-muted"
    >
      {{ $t('event.grid.empty') }}
    </div>

    <div v-else id="tour-calendar-cards" class="flex flex-col gap-4 max-w-2xl w-full mx-auto">
      <template
        v-for="card in filteredCards"
        :key="cardKey(card)"
      >
        <CalendarCardEvent
          v-if="card.kind === 'event'"
          :event="card.event"
          :tournaments="card.tournaments"
        />
        <CalendarCardTournament
          v-else
          :tournament="card.tournament"
        />
      </template>
    </div>

    <CalendarPartnerDiscounts />
    <CalendarFooter />
    <CalendarDetailSlideover />
  </div>
</template>
