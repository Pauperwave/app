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
  one Tournament actually names it (Tournament.event, matched by name, see
  server/api/tournaments.ts); a bare Event with no linked tournaments
  doesn't appear at all. Rendering itself lives in CalendarCard.vue (shared
  shell) and its two variants, CalendarEventCard.vue / CalendarTournamentCard.vue
  — this component only builds and filters the `filteredCards` list.
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

// Scoped to a single month at a time, per user request 2026-08-13 — unlike
// the dashboard grid (events/index.vue), which defaults to "all time". Starts
// on the current month; the picker below (UCalendar type="month", same
// @internationalized/date bridge as HomeDateRangePicker.vue) jumps to another.
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

function cardKey(card: CalendarCardEntry): string {
  const id = card.kind === 'event' ? card.event.id : card.tournament.id
  return `${card.kind}-${id}`
}

const cards = computed<CalendarCardEntry[]>(() => {
  const eventsByName = new Map((eventsData.value ?? []).map(event => [event.name, event]))
  const eventGroups = new Map<string, Tournament[]>()
  const standalone: Tournament[] = []

  for (const tournament of tournamentsData.value ?? []) {
    if (tournament.event) {
      const existing = eventGroups.get(tournament.event) ?? []
      eventGroups.set(tournament.event, [...existing, tournament])
    } else {
      standalone.push(tournament)
    }
  }

  const eventCards: CalendarCardEntry[] = [...eventGroups.entries()].flatMap(
    ([eventName, tournaments]) => {
      const event = eventsByName.get(eventName)
      return event ? [{ kind: 'event' as const, event, tournaments }] : []
    }
  )

  const tournamentCards: CalendarCardEntry[] = standalone.map(
    tournament => ({ kind: 'tournament' as const, tournament })
  )

  return [...eventCards, ...tournamentCards]
    .sort((a, b) => cardDate(a).getTime() - cardDate(b).getTime())
})

const filteredCards = computed(() => cards.value.filter((card) => {
  const date = cardDate(card)
  return date >= range.value.start && date <= range.value.end
}))
</script>

<template>
  <div class="relative flex-1 flex flex-col gap-4 px-6 py-8 md:px-10">
    <h1 class="sr-only">
      {{ $t('event.breadcrumb') }}
    </h1>

    <!-- TODO there is a bug on mobile -->
    <LayoutColorModeSwitch class="absolute right-4 top-4 z-10 md:right-8 md:top-8" />

    <div class="flex justify-center">
      <div class="flex items-center gap-3 bg-elevated rounded-2xl px-6 py-3 shadow-xl">
        <img
          src="https://avatars.githubusercontent.com/u/225214755?s=200&v=4"
          alt="PauperWave"
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

    <div class="flex justify-center">
      <UPopover>
        <UButton
          :label="format(selectedMonth, 'MMMM yyyy', { locale: it })"
          class="capitalize"
          color="neutral"
          variant="ghost"
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

    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="animate-spin text-3xl text-muted" />
    </div>

    <div
      v-else-if="!filteredCards.length"
      class="text-center py-12 text-muted"
    >
      {{ $t('event.grid.empty') }}
    </div>

    <div v-else class="flex flex-col gap-4 max-w-2xl w-full mx-auto">
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

    <CalendarFooter />
    <CalendarDetailSlideover />
  </div>
</template>
