<!-- app\components\events\CalendarDetailSlideover.vue -->
<!--
  Right-side detail panel for /calendario (user request 2026-08-14, same
  USlideover pattern as NotificationsSlideover.vue) — reads
  useCalendarDetail.ts, written by CalendarEventCard.vue /
  CalendarTournamentCard.vue when a card is tapped. Mounted once in
  PublicCalendarPage.vue.

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

const title = computed(() => {
  if (!selection.value) return ''
  return selection.value.kind === 'event' ? selection.value.event.name : selection.value.tournament.name
})

function tournamentTimeRange(startDate: string, endDate: string): string {
  const start = format(new Date(startDate), 'HH:mm')
  const end = format(new Date(endDate), 'HH:mm')
  return `${start}–${end}`
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
</script>

<template>
  <USlideover v-model:open="isOpen" :title="title" inset>
    <template #body>
      <template v-if="selection?.kind === 'event'">
        <img
          v-if="selection.event.image"
          :src="selection.event.image"
          :alt="selection.event.name"
          class="w-full max-h-56 object-cover rounded-xl mb-4"
        >

        <UBadge
          :color="eventStatusColor(selection.event.status)"
          variant="subtle"
          :icon="EVENT_STATUS_ICONS[selection.event.status]"
          class="mb-3"
        >
          {{ t(`event.status.${selection.event.status}`) }}
        </UBadge>

        <div class="flex flex-col gap-2 text-sm text-muted mb-4">
          <p class="flex items-center gap-2">
            <UIcon :name="ICONS.calendar" class="size-4 shrink-0" />
            {{ format(new Date(selection.event.startDate), 'PPPP', { locale: it }) }}
          </p>
          <a
            :href="googleMapsUrl(selection.event.location)"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-2 hover:underline w-fit"
          >
            <UIcon :name="ICONS.mapPin" class="size-4 shrink-0" />
            {{ selection.event.location }}
          </a>
        </div>

        <div class="flex flex-wrap gap-2 mb-4">
          <EventsAddToCalendarButton :item="selection.event" />
          <EventsRegisterButton />
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
            <span
              class="px-1.5 py-0.5 rounded text-xs font-medium shrink-0"
              :class="cittadinoFormatClass(tournament.format)"
            >
              {{ tournament.format }}
            </span>
            <span class="truncate flex-1 min-w-0">{{ tournament.name }}</span>
            <span class="text-muted text-xs shrink-0">
              {{ tournamentTimeRange(tournament.startDate, tournament.endDate) }}
            </span>
          </button>
        </div>
      </template>

      <template v-else-if="selection?.kind === 'tournament'">
        <img
          v-if="selection.tournament.image"
          :src="selection.tournament.image"
          :alt="selection.tournament.name"
          class="w-full max-h-56 object-cover rounded-xl mb-4"
        >

        <div class="flex items-center gap-2 mb-3">
          <span
            class="px-1.5 py-0.5 rounded text-xs font-medium"
            :class="cittadinoFormatClass(selection.tournament.format)"
          >
            {{ selection.tournament.format }}
          </span>
          <UBadge
            :color="tournamentStatusColor(selection.tournament.status)"
            variant="subtle"
            :icon="TOURNAMENT_STATUS_ICONS[selection.tournament.status]"
          >
            {{ t(`event.status.${selection.tournament.status}`) }}
          </UBadge>
        </div>

        <div class="flex flex-col gap-2 text-sm text-muted mb-4">
          <p class="flex items-center gap-2">
            <UIcon :name="ICONS.calendar" class="size-4 shrink-0" />
            {{ format(new Date(selection.tournament.startDate), 'PPPP', { locale: it }) }}
            · {{ selectedTournamentTimeRange }}
          </p>
          <a
            :href="googleMapsUrl(selection.tournament.location)"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-2 hover:underline w-fit"
          >
            <UIcon :name="ICONS.mapPin" class="size-4 shrink-0" />
            {{ selection.tournament.location }}
          </a>
          <p class="flex items-center gap-2">
            <UIcon :name="ICONS.player" class="size-4 shrink-0" />
            {{ t('tournament.columns.organizer') }}: {{ selection.tournament.organizer }}
          </p>
          <a
            v-if="selection.tournament.contactName"
            :href="`tel:${selection.tournament.contactPhone}`"
            class="flex items-center gap-2 hover:underline w-fit"
          >
            <UIcon :name="ICONS.phone" class="size-4 shrink-0" />
            {{ t('tournament.contact') }}: {{ selection.tournament.contactName }}
          </a>
          <p class="flex items-center gap-2">
            <UIcon :name="ICONS.euro" class="size-4 shrink-0" />
            {{ t('tournament.columns.entryFee') }}: {{ selection.tournament.entryFee }} €
          </p>
        </div>

        <p v-if="selection.tournament.description" class="text-sm whitespace-pre-line mb-4">
          {{ selection.tournament.description }}
        </p>

        <p v-if="selection.tournament.prizes" class="text-sm text-muted mb-4">
          {{ t('tournament.columns.prizes') }}: {{ selection.tournament.prizes }}
        </p>

        <div class="flex flex-wrap gap-2 mb-4">
          <EventsAddToCalendarButton :item="selection.tournament" />
          <EventsRegisterButton />
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
      </template>
    </template>
  </USlideover>
</template>
