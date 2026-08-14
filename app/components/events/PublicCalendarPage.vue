<!-- app\components\events\PublicCalendarPage.vue -->
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

  Rebuilt around a mixed timeline of Events and Tournaments, per user
  clarification: most calendar items are standalone tournaments (e.g. a
  single Draft night is just a Tournament with format "draft"), not an
  "Evento" — an Event only shows up here as a grouping card when at least
  one Tournament actually names it (Tournament.event, matched by name, see
  server/api/tournaments.ts); a bare Event with no linked tournaments
  doesn't appear at all. Both kinds share the same visual shell (date box,
  name, status badge, location) and carry their own status independently
  (an Event card's status is the event's own, not derived from its nested
  tournaments, which each keep theirs).

  Format chips reuse cittadinoFormatClass (same tint mapping as the
  Cittadino standings matrix, app/utils/cittadinoFormats.ts). Each
  tournament shows a start–end time range from its own explicit
  startDate/endDate (tournaments within the same event can overlap). The
  header is the PauperWave mark instead of a plain "Eventi" title (kept as
  an sr-only h1 for a11y/SEO).
-->
<script lang="ts" setup>
import { addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { it } from 'date-fns/locale'
import type { Event, EventStatus, Tournament } from '~/types'

const { t } = useI18n()

useSeoMeta({ title: () => t('event.seoTitle') })

// Scoped to a single month at a time, per user request 2026-08-13 — unlike
// the dashboard grid (events/index.vue), which defaults to "all time". Starts
// on the current month; the selector below moves it forward/back.
const selectedMonth = shallowRef(startOfMonth(new Date()))

const range = computed(() => ({
  start: startOfMonth(selectedMonth.value),
  end: endOfMonth(selectedMonth.value)
}))

function goToPreviousMonth() {
  selectedMonth.value = subMonths(selectedMonth.value, 1)
}

function goToNextMonth() {
  selectedMonth.value = addMonths(selectedMonth.value, 1)
}

const { data: eventsData, isLoading: loadingEvents } = useEventsQuery()
const { data: tournamentsData, isLoading: loadingTournaments } = useTournamentsQuery()
const loading = computed(() => loadingEvents.value || loadingTournaments.value)

interface EventCard { kind: 'event', event: Event, tournaments: Tournament[] }
interface TournamentCard { kind: 'tournament', tournament: Tournament }
type CalendarCard = EventCard | TournamentCard

function cardDate(card: CalendarCard): Date {
  return new Date(card.kind === 'event' ? card.event.startDate : card.tournament.startDate)
}

// EventStatus and TournamentStatus are the same set of literals — treated
// as one status here since a card can be either kind.
function cardStatus(card: CalendarCard): EventStatus {
  return card.kind === 'event' ? card.event.status : card.tournament.status
}

// Both Event and Tournament share this shape (name/startDate/status/
// location), so the shared header (date box, title, status badge, location)
// doesn't need to branch on card.kind — only the body below it does.
function cardHeader(card: CalendarCard) {
  return card.kind === 'event' ? card.event : card.tournament
}

function cardKey(card: CalendarCard): string {
  return `${card.kind}-${cardHeader(card).id}`
}

const cards = computed<CalendarCard[]>(() => {
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

  const eventCards: CalendarCard[] = [...eventGroups.entries()].flatMap(
    ([eventName, tournaments]) => {
      const event = eventsByName.get(eventName)
      return event ? [{ kind: 'event' as const, event, tournaments }] : []
    }
  )

  const tournamentCards: CalendarCard[] = standalone.map(
    tournament => ({ kind: 'tournament' as const, tournament })
  )

  return [...eventCards, ...tournamentCards]
    .sort((a, b) => cardDate(a).getTime() - cardDate(b).getTime())
})

const cardsInRange = computed(() => cards.value.filter((card) => {
  const date = cardDate(card)
  return date >= range.value.start && date <= range.value.end
}))

const statusFilter = ref<'all' | EventStatus>('all')

const filteredCards = computed(() => cardsInRange.value.filter(card =>
  statusFilter.value === 'all' || cardStatus(card) === statusFilter.value))

const statusTabs = computed<{ label: string, value: 'all' | EventStatus, count?: number }[]>(() => {
  const counts: Record<EventStatus, number> = {
    scheduled: 0, ongoing: 0, completed: 0, canceled: 0
  }
  for (const card of cardsInRange.value) counts[cardStatus(card)]++

  return [
    { label: t('event.filters.statusAll'), value: 'all', count: undefined },
    { label: t('event.status.scheduled'), value: 'scheduled', count: counts.scheduled },
    { label: t('event.status.ongoing'), value: 'ongoing', count: counts.ongoing },
    { label: t('event.status.completed'), value: 'completed', count: counts.completed },
    { label: t('event.status.canceled'), value: 'canceled', count: counts.canceled }
  ]
})

// Tournament.startDate/endDate are explicit fields (server/api/tournaments.ts,
// fake for now — a real "inizio"/"fine" pair once a Supabase table backs
// this), not derived from roundCount/roundDuration — so overlapping
// tournaments within the same event show real, distinct ranges.
function tournamentTimeRange(tournament: Tournament): string {
  const start = format(new Date(tournament.startDate), 'HH:mm')
  const end = format(new Date(tournament.endDate), 'HH:mm')
  return `${start}–${end}`
}

// Only shown when the card has a cover image (the date box it replaces
// already displays this info otherwise) — see the template's img/date-box
// branch.
function cardDateLabel(card: CalendarCard): string {
  return format(cardDate(card), 'd MMMM', { locale: it })
}
</script>

<template>
  <div class="flex-1 flex flex-col gap-4 px-6 py-8 md:px-10">
    <h1 class="sr-only">
      {{ $t('event.breadcrumb') }}
    </h1>

    <div class="flex justify-center">
      <div class="flex items-center gap-3 bg-neutral-950 rounded-2xl px-6 py-3 shadow-xl">
        <img
          src="https://avatars.githubusercontent.com/u/225214755?s=200&v=4"
          alt="PauperWave"
          class="size-10 rounded-full shrink-0"
        >
        <span class="neon-sign">pauperwave</span>
      </div>
    </div>

    <div class="flex items-center justify-center gap-3">
      <UButton
        :icon="ICONS.chevronLeft"
        :aria-label="$t('event.calendar.previousMonth')"
        color="neutral"
        variant="ghost"
        @click="goToPreviousMonth"
      />
      <span class="font-medium capitalize min-w-40 text-center">
        {{ format(selectedMonth, 'MMMM yyyy', { locale: it }) }}
      </span>
      <UButton
        :icon="ICONS.chevronRight"
        :aria-label="$t('event.calendar.nextMonth')"
        color="neutral"
        variant="ghost"
        @click="goToNextMonth"
      />
    </div>

    <StatusFilterGroup v-model="statusFilter" :items="statusTabs" />

    <UAlert
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      class="shrink-0"
      :description="$t('event.calendar.mockDataNotice')"
    />

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
      <UCard v-for="card in filteredCards" :key="cardKey(card)">
        <div class="flex items-start gap-4">
          <!-- Luma-inspired: a cover image (when set, Event.image/Tournament.image
               are both optional) takes over the date box's spot — the date
               moves into a text line below the title instead. -->
          <img
            v-if="cardHeader(card).image"
            :src="cardHeader(card).image ?? undefined"
            :alt="cardHeader(card).name"
            class="size-20 rounded-xl object-cover shrink-0"
          >
          <div
            v-else
            class="flex flex-col items-center justify-center shrink-0 rounded-lg bg-elevated px-3 py-2 text-center"
          >
            <span class="text-xs font-medium uppercase text-muted">
              {{ format(new Date(cardHeader(card).startDate), 'MMM', { locale: it }) }}
            </span>
            <span class="text-2xl font-bold text-highlighted leading-none">
              {{ format(new Date(cardHeader(card).startDate), 'd') }}
            </span>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <h3 class="font-semibold truncate">
                {{ cardHeader(card).name }}
              </h3>
              <UBadge
                :color="eventStatusColor(cardHeader(card).status)"
                variant="subtle"
                :icon="EVENT_STATUS_ICONS[cardHeader(card).status]"
                class="shrink-0"
              >
                {{ t(`event.status.${cardHeader(card).status}`) }}
              </UBadge>
            </div>

            <p
              v-if="cardHeader(card).image"
              class="flex items-center gap-1 text-sm text-muted mt-1"
            >
              <UIcon :name="ICONS.calendar" class="size-4 shrink-0" />
              <span>{{ cardDateLabel(card) }}</span>
            </p>

            <p class="flex items-center gap-1 text-sm text-muted mt-1">
              <UIcon :name="ICONS.mapPin" class="size-4 shrink-0" />
              <span class="truncate">{{ cardHeader(card).location }}</span>
            </p>

            <!-- Standalone tournament card: format + time range live here,
                 next to the header, since there's no nested list below. -->
            <div v-if="card.kind === 'tournament'" class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-sm">
              <span
                class="px-1.5 py-0.5 rounded text-xs font-medium shrink-0"
                :class="cittadinoFormatClass(card.tournament.format)"
              >
                {{ card.tournament.format }}
              </span>
              <span class="text-muted text-xs shrink-0">
                {{ tournamentTimeRange(card.tournament) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Event card: nested tournament list. -->
        <div
          v-if="card.kind === 'event'"
          class="mt-3 pt-3 border-t border-default flex flex-col gap-2"
        >
          <p class="text-xs font-medium uppercase text-muted">
            {{ $t('tournament.breadcrumb') }}
          </p>

          <div
            v-for="tournament in card.tournaments"
            :key="tournament.id"
            class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
          >
            <span
              class="px-1.5 py-0.5 rounded text-xs font-medium shrink-0"
              :class="cittadinoFormatClass(tournament.format)"
            >
              {{ tournament.format }}
            </span>

            <span class="truncate flex-1 min-w-0">{{ tournament.name }}</span>

            <UBadge
              :color="tournamentStatusColor(tournament.status)"
              variant="subtle"
              :icon="TOURNAMENT_STATUS_ICONS[tournament.status]"
              size="sm"
              class="shrink-0"
            >
              {{ t(`event.status.${tournament.status}`) }}
            </UBadge>

            <span class="text-muted text-xs shrink-0">
              {{ tournamentTimeRange(tournament) }}
            </span>
          </div>
        </div>

        <div class="flex justify-end mt-4">
          <UButton
            :label="$t('event.calendar.addToCalendar')"
            :icon="ICONS.calendarAdd"
            color="neutral"
            variant="subtle"
            size="sm"
            @click="downloadEventIcs(cardHeader(card))"
          />
        </div>
      </UCard>
    </div>
  </div>
</template>

<style scoped>
.neon-sign {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #fff;
  text-shadow:
    0 0 4px #fff,
    0 0 11px #fff,
    0 0 19px #fff,
    0 0 40px var(--ui-secondary),
    0 0 80px var(--ui-secondary),
    0 0 90px var(--ui-secondary),
    0 0 100px var(--ui-secondary);
  animation: neon-flicker 4s infinite;
}

@keyframes neon-flicker {
  0%, 17%, 19%, 21%, 55%, 58%, 100% {
    text-shadow:
      0 0 4px #fff,
      0 0 11px #fff,
      0 0 19px #fff,
      0 0 40px var(--ui-secondary),
      0 0 80px var(--ui-secondary),
      0 0 90px var(--ui-secondary),
      0 0 100px var(--ui-secondary);
  }
  18%, 20%, 56% {
    text-shadow: none;
  }
}
</style>
