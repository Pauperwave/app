<!-- app\components\events\CalendarCard.vue -->
<!--
  Shared shell for /calendario's mixed timeline (see PublicCalendarPage.vue):
  the image/date-box, title, status badge, and location line are identical
  whether the card represents an Event or a standalone Tournament — only the
  body below the shared header differs, supplied by CalendarEventCard.vue /
  CalendarTournamentCard.vue via the #body (inline, next to the header) and
  #footer (full-width, below it) slots. The "Aggiungi al calendario" button
  itself is AddToCalendarButton.vue, which owns its own device-aware
  behavior. Tapping anywhere else on the card emits `select` — the two
  variants turn that into opening CalendarDetailSlideover.vue via
  useCalendarDetail.ts (user request 2026-08-14) — the button's own wrapper
  stops propagation so tapping it doesn't also open the slideover.
-->
<script lang="ts" setup>
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import type { EventStatus } from '~/types'
import type { CalendarIcsItem } from '~/utils/events/eventIcs'

interface Props {
  name: string
  startDate: string
  status: EventStatus
  location: string
  image: string | null
  icsItem: CalendarIcsItem
  participants?: string[]
}

const {
  name, startDate, status, location, image, icsItem, participants = []
} = defineProps<Props>()

defineEmits<{ select: [] }>()

const { t } = useI18n()
</script>

<template>
  <UCard class="cursor-pointer" @click="$emit('select')">
    <div class="flex items-start gap-4">
      <!-- Luma-inspired: a cover image (both Event.image/Tournament.image are
           optional) takes over the date box's spot — the date moves into a
           text line below the title instead. -->
      <img
        v-if="image"
        :src="image"
        :alt="name"
        class="size-20 rounded-xl object-cover shrink-0"
      >
      <div
        v-else
        class="flex flex-col items-center justify-center shrink-0 rounded-lg bg-elevated px-3 py-2 text-center"
      >
        <span class="text-xs font-medium uppercase text-muted">
          {{ format(new Date(startDate), 'MMM', { locale: it }) }}
        </span>
        <span class="text-2xl font-bold text-highlighted leading-none">
          {{ format(new Date(startDate), 'd') }}
        </span>
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-semibold truncate">
            {{ name }}
          </h3>
          <UBadge
            :color="eventStatusColor(status)"
            variant="subtle"
            :icon="EVENT_STATUS_ICONS[status]"
            class="shrink-0"
          >
            {{ t(`event.status.${status}`) }}
          </UBadge>
        </div>

        <p v-if="image" class="flex items-center gap-1 text-sm text-muted mt-1">
          <UIcon :name="ICONS.calendar" class="size-4 shrink-0" />
          <span>{{ format(new Date(startDate), 'd MMMM', { locale: it }) }}</span>
        </p>

        <a
          :href="googleMapsUrl(location)"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1 text-sm text-muted mt-1 hover:underline w-fit"
          @click.stop
        >
          <UIcon :name="ICONS.mapPin" class="size-4 shrink-0" />
          <span class="truncate">{{ location }}</span>
        </a>

        <div v-if="participants.length" class="flex items-center gap-2 mt-2">
          <UAvatarGroup size="xs" :max="5">
            <UAvatar
              v-for="participant in participants"
              :key="participant"
              :src="generatePlayerAvatar(participant)"
              :alt="participant"
            />
          </UAvatarGroup>
          <span class="text-xs text-muted">
            {{ t('tournament.participants') }}: {{ participants.length }}
          </span>
        </div>

        <slot name="body" />
      </div>
    </div>

    <slot name="footer" />

    <div class="flex justify-end gap-2 mt-4" @click.stop>
      <EventsAddToCalendarButton :item="icsItem" />
      <EventsRegisterButton />
    </div>
  </UCard>
</template>
