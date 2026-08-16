<!-- app\components\calendar\DetailSlideover.vue -->
<!--
  Right-side detail panel for /calendario (user request 2026-08-14, same
  USlideover pattern as NotificationsSlideover.vue) — reads
  useCalendarDetail.ts, written by CalendarEventCard.vue /
  CalendarTournamentCard.vue when a card is tapped. Mounted once in
  PublicCalendarPage.vue.

  No native header/title bar (2026-08-14 redesign, same "full-bleed image +
  bottom gradient + overlaid title" hero as MagicTheGathering/league's
  CommanderArt.vue) — the image spans the top edge-to-edge, close button
  floats over it, and the title sits on the gradient instead of a separate
  bar above. :close="false" + no :title prop suppresses USlideover's default
  header entirely (see its own source: the header only renders when a
  title/description/close prop or slot is present).

  Participant rows use UUser + generatePlayerAvatar() directly, not
  PlayerTag.vue — that component always calls useAssociatesQuery()
  internally (even without an associateUuid prop), which queries
  pauperwave_associates_with_status with the anon Supabase client. On this
  public, unauthenticated page that's a real exposure risk given
  docs/BACKLOG.md's open P1 on that table's overly permissive RLS policy —
  participants here are plain name strings anyway, not linked to an
  associate record.
-->
<script lang="ts" setup>
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import type { Tournament } from '~/types'

const selection = useCalendarDetail()
const { t } = useI18n()

const isOpen = computed({
  get: () => selection.value !== null,
  set: (value: boolean) => {
    if (!value) selection.value = null
  }
})

// Mobile back-gesture support (user request 2026-08-14): without a pushed
// history entry, swiping back while the slideover is open navigates away
// from /calendario entirely instead of just dismissing it. Pushing a marker
// entry when it opens means the gesture's popstate closes the slideover
// first; `closingViaPopState` stops the resulting selection→isOpen watch
// from calling history.back() a second time for a back that already
// happened. Closing any other way (X button, clicking outside, selecting a
// nested tournament) still needs that history.back() to drop the marker
// entry, or the next real back-gesture would land on a stale one instead of
// leaving the page.
let closingViaPopState = false

watch(isOpen, (open, wasOpen) => {
  if (open && !wasOpen) {
    history.pushState({ calendarDetailOpen: true }, '')
  } else if (!open && wasOpen && !closingViaPopState) {
    history.back()
  }
  closingViaPopState = false
})

function onPopState() {
  if (!selection.value) return
  closingViaPopState = true
  selection.value = null
}

onMounted(() => window.addEventListener('popstate', onPopState))
onUnmounted(() => window.removeEventListener('popstate', onPopState))

function tournamentTimeRange(startDate: string, endDate: string | null): string {
  const start = format(new Date(startDate), 'HH:mm')
  if (!endDate) return start
  const end = format(new Date(endDate), 'HH:mm')
  return `${start} - ${end}`
}

const selectedTournamentTimeRange = computed(() => {
  if (selection.value?.kind !== 'tournament') return ''
  const { startDate, endDate } = selection.value.tournament
  return tournamentTimeRange(startDate, endDate)
})

// Switches the slideover to a tournament nested under the currently open
// event, instead of closing it.
function openTournament(tournament: Tournament) {
  selection.value = { kind: 'tournament', tournament }
}

// fallow-ignore-file code-duplication -- the event/tournament hero markup
// (image + gradient + title, then the date row) shares shape, but each
// branch diverges immediately after: event shows a nested tournaments list,
// tournament shows organizer/contact/fee/prizes/description. Extracting a
// shared component for the ~9-line overlap would need several slots just to
// paper over that divergence — see feedback_dedup_threshold_call_sites memory.
</script>

<template>
  <!-- fallow-ignore-file code-duplication -- see the top-of-file comment -->
  <USlideover
    v-model:open="isOpen"
    inset
    :close="false"
    :ui="{ body: 'p-0 sm:p-0 flex-1 overflow-y-auto' }"
  >
    <template #body="{ close }">
      <template v-if="selection?.kind === 'event'">
        <div class="relative overflow-hidden rounded-t-lg">
          <img
            :src="selection.event.image ?? DEFAULT_CALENDAR_COVER_IMAGE"
            :alt="selection.event.name"
            class="w-full max-h-80 sm:max-h-96 object-cover"
          >

          <div class="absolute inset-0 bg-linear-to-b from-transparent to-default" />

          <!-- Da rimpiazzare con il bottone di condivisione -->
          <!-- <UButton
            :icon="ICONS.close"
            color="neutral"
            variant="subtle"
            square
            class="absolute top-4 inset-e-4"
            :aria-label="$t('common.close')"
            @click="close"
          /> -->

          <h2 class="absolute bottom-0 left-0 right-0 p-4 text-xl font-bold text-white truncate">
            {{ selection.event.name }}
          </h2>
        </div>

        <div class="p-4 sm:p-6">
          <div class="flex flex-col gap-2 text-sm text-muted mb-4">
            <p class="flex items-center gap-2">
              <UIcon :name="ICONS.calendar" class="size-5 shrink-0" />
              {{ format(new Date(selection.event.startDate), 'PPPP', { locale: it }) }}
            </p>
            <a
              v-if="selection.event.location"
              :href="googleMapsUrl(selection.event.locationAddress ?? selection.event.location)"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-2 hover:underline w-fit"
            >
              <UIcon :name="ICONS.mapPin" class="size-5 shrink-0" />
              {{ selection.event.location }}
            </a>
          </div>

          <div class="flex flex-wrap gap-2 mb-4">
            <CalendarButtonShareButton
              :name="selection.event.name"
              :start-date="selection.event.startDate"
            />
            <CalendarButtonAddToCalendarButton :item="selection.event" />
            <CalendarButtonRegisterButton />
          </div>

          <div v-if="selection.tournaments.length" class="pt-4 border-t border-default flex flex-col gap-2">
            <p class="text-xs font-medium uppercase text-muted">
              {{ t('tournament.breadcrumb') }}
            </p>

            <button
              v-for="tournament in selection.tournaments"
              :key="tournament.id"
              type="button"
              class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-left hover:underline"
              @click="openTournament(tournament)"
            >
              <BadgesFormatBadge :format="tournament.format" />
              <span class="truncate flex-1 min-w-0">{{ tournament.name }}</span>
              <span class="text-muted text-xs shrink-0">
                {{ tournamentTimeRange(tournament.startDate, tournament.endDate) }}
              </span>
            </button>
          </div>
        </div>
      </template>

      <template v-else-if="selection?.kind === 'tournament'">
        <div class="relative overflow-hidden rounded-t-lg">
          <img
            :src="selection.tournament.image ?? DEFAULT_CALENDAR_COVER_IMAGE"
            :alt="selection.tournament.name"
            class="w-full max-h-80 sm:max-h-96 object-cover"
          >

          <div class="absolute inset-0 bg-linear-to-b from-transparent to-default" />

          <UButton
            :icon="ICONS.close"
            color="neutral"
            variant="subtle"
            square
            class="absolute top-4 inset-e-4"
            :aria-label="$t('common.close')"
            @click="close"
          />

          <h2 class="absolute bottom-0 left-0 right-0 p-4 text-xl font-bold text-white truncate">
            {{ selection.tournament.name }}
          </h2>
        </div>

        <div class="p-4 sm:p-6">
          <div class="flex flex-col gap-2 text-sm text-muted mb-4">
            <p class="flex items-center gap-2">
              <UIcon :name="ICONS.calendar" class="size-5 shrink-0" />
              {{ format(new Date(selection.tournament.startDate), 'PPPP', { locale: it }) }}
              · {{ selectedTournamentTimeRange }}
            </p>
            <a
              v-if="selection.tournament.location"
              :href="googleMapsUrl(
                selection.tournament.locationAddress ?? selection.tournament.location
              )"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-2 hover:underline w-fit"
            >
              <UIcon :name="ICONS.mapPin" class="size-5 shrink-0" />
              {{ selection.tournament.location }}
            </a>
            <p v-if="selection.tournament.organizer" class="flex items-center gap-2">
              <UIcon :name="ICONS.player" class="size-5 shrink-0" />
              {{ t('tournament.columns.organizer') }}: {{ selection.tournament.organizer }}
            </p>
            <a
              v-if="selection.tournament.contactName"
              :href="`tel:${selection.tournament.contactPhone}`"
              class="flex items-center gap-2 hover:underline w-fit"
            >
              <UIcon :name="ICONS.phone" class="size-5 shrink-0" />
              {{ t('tournament.contact') }}: {{ selection.tournament.contactName }}
            </a>
            <p v-if="selection.tournament.entryFee !== null" class="flex items-center gap-2">
              <UIcon :name="ICONS.euro" class="size-5 shrink-0" />
              {{ t('tournament.columns.entryFee') }}: {{ selection.tournament.entryFee }} €
            </p>
            <p v-if="selection.tournament.prizes" class="flex items-center gap-2">
              <UIcon :name="ICONS.standings" class="size-5 shrink-0" />
              {{ t('tournament.columns.prizes') }}: {{ selection.tournament.prizes }}
            </p>
          </div>

          <p v-if="selection.tournament.description" class="text-sm whitespace-pre-line mb-4">
            {{ selection.tournament.description }}
          </p>

          <div class="flex flex-wrap gap-2 mb-4">
            <CalendarButtonShareButton
              :name="selection.tournament.name"
              :start-date="selection.tournament.startDate"
            />
            <CalendarButtonAddToCalendarButton :item="selection.tournament" />
            <CalendarButtonRegisterButton />
          </div>

          <div v-if="selection.tournament.participants.length" class="pt-4 border-t border-default">
            <p class="text-xs font-medium uppercase text-muted mb-2">
              {{ t('tournament.participants') }} ({{ selection.tournament.participants.length }})
            </p>
            <ul class="flex flex-col gap-2">
              <li
                v-for="(participant, index) in selection.tournament.participants"
                :key="participant"
                class="flex items-center gap-2"
              >
                <span class="text-xs text-dimmed w-4 text-right shrink-0">{{ index + 1 }}.</span>
                <UUser
                  :name="participant"
                  :avatar="{ src: generatePlayerAvatar(participant), alt: participant }"
                  size="sm"
                />
              </li>
            </ul>
          </div>
        </div>
      </template>
    </template>
  </USlideover>
</template>
