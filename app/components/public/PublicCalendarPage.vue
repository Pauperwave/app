<!-- app\components\public\PublicCalendarPage.vue -->
<!-- Public (no auth) counterpart to pages/(competitions)/events/index.vue, backing
     calendario.pauperwave.org (settings/domains.vue), mounted at /calendario
     (app/pages/(public)/calendario/index.vue): not /events (the internal dashboard route) and not
     /calendar (an unrelated in-development dashboard page, see shared/utils/publicHosts.ts). Cards
     are not clickable: GridView.vue links to /events/<id>, the internal detail page, which would
     bounce an anonymous visitor to /login.  Built around a mixed timeline of Events and
     Tournaments: most calendar items are standalone tournaments (a single Draft night is a
     Tournament with format "draft"), not an "Evento". An Event only appears as a grouping card when
     at least one Tournament links it (tournaments.event_uuid, matched by uuid); a bare Event with
     no linked tournaments doesn't appear. Rendering lives in calendar/card/Base.vue (shared shell)
     and calendar/card/Event.vue / calendar/card/Tournament.vue: this component only builds and
     filters `filteredCards`. -->
<script lang="ts" setup>
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { it } from 'date-fns/locale'
import { CalendarDate, getLocalTimeZone } from '@internationalized/date'
import type { Event, Tournament } from '~/types'

const { t } = useI18n()

useSeoMeta({
  title: () => t('event.seoTitle')
})

// The today/month-picker/city-filter row collapses to compact controls below sm (same
// breakpoint/composable as leagues/[leagueId]/index.vue's isSideBySide)
const isCompact = useMediaQuery('(max-width: 639px)')

// Scoped to a single month at a time, unlike the dashboard grid (events/index.vue), which defaults
// to "all time". Starts on the current month; the picker below (UCalendar type="month", same
// @internationalized/date bridge as DateRangePicker.vue) jumps to another
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

// External (shop-organized, e.g. Magman) tournaments are hidden from this public calendar by
// default, like tournaments/index.vue's showExternal toggle
const showExternal = ref(false)

// Draft tournaments are always excluded, with no toggle: unlike "external" (a real tournament
// organized by someone else), a draft is not ready to be public. useTournamentsQuery() has no
// status filter (only deleted_at) and status is only used for the badge/isPast check
// (calendar/card/Base.vue), so drafts would otherwise be fully visible here, including on the
// unauthenticated calendario.pauperwave.org route
const visibleTournamentsData = computed(() => (tournamentsData.value ?? [])
  .filter(tournament => tournament.status !== 'draft')
  .filter(tournament => showExternal.value || tournament.status !== 'external'))

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
  // Matched by uuid, not name: a name collision between two events can't misgroup a tournament
  const eventsByUuid = new Map((eventsData.value ?? []).map(event => [event.uuid, event]))
  const eventGroups = new Map<string, Tournament[]>()
  const standalone: Tournament[] = []

  for (const tournament of visibleTournamentsData.value) {
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

// City filter: 'all' sentinel, not null (like useTournamentsFilters.ts's
// statusFilter/formatFilter). The option *list* is built from every known card (cards, not
// monthCards) so it doesn't flicker as the month changes (a month with one active city would hide
// the control). Counts stay scoped to monthCards so badges match what's on screen; the "Tutte" tab
// gets no count badge (undefined), like every 'all' tab
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
    // A city with no events in the selected month stays listed (see the `cities` set comment) but
    // disabled: hiding it flickers the list per month, leaving it clickable leads to an empty state
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

      <!-- Only shown once there's a real choice (Tutte + 2+ cities): a single-city month would show
           a redundant "Tutte" next to the only option. Collapses to a compact select below sm
           instead of StatusFilterGroup's button row, which doesn't wrap and would push the row to
           two lines. -->
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

      <!-- External (shop-organized, not Pauperwave) tournaments are hidden by default (see
           showExternal above): this toggles the filter back on, like
           tournaments/list/FiltersBar.vue's icon-only toggle -->
      <UTooltip
        :text="$t(showExternal
          ? 'event.calendarHideExternal'
          : 'event.calendarShowExternal')"
      >
        <UButton
          :icon="showExternal ? ICONS.hide : ICONS.show"
          color="neutral"
          variant="outline"
          :aria-label="$t(showExternal
            ? 'event.calendarHideExternal'
            : 'event.calendarShowExternal')"
          @click="showExternal = !showExternal"
        />
      </UTooltip>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon :name="ICONS.loading" class="animate-spin text-3xl text-muted" />
    </div>

    <EmptyState
      v-else-if="!filteredCards.length"
      :message="$t('event.grid.empty')"
    />

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
