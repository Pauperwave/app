<!-- app\components\calendar\card\Base.vue -->
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
import type { CalendarIcsItem } from '~/utils/events/eventIcs'
import type { EventStatus, TournamentStatus } from '~/types'

interface Props {
  name: string
  startDate: string
  // Shared between Event and Tournament cards, which have independently
  // evolving status vocabularies (migration 20260815100000) — only the
  // 'completed' literal common to both is ever compared here, but the union
  // (rather than a bare string) costs nothing: Tournament.vue/Event.vue's
  // only two call sites already pass exactly these two types.
  status: EventStatus | TournamentStatus
  // Nullable (2026-08-15): not every tournament has a location_uuid set yet.
  // locationAddress feeds the maps link when present (more precise than the
  // venue name alone); falls back to `location` when it isn't.
  location: string | null
  locationAddress?: string | null
  image: string | null
  icsItem: CalendarIcsItem
  participants?: string[]
}

const {
  name,
  startDate,
  status,
  location,
  locationAddress = null,
  image,
  icsItem,
  participants = []
} = defineProps<Props>()

defineEmits<{ select: [] }>()

const { t } = useI18n()

// A completed (past) card is muted instead of colored, so the timeline
// visually recedes as it scrolls further back. The status badge itself was
// dropped from the header corner (2026-08-14, replaced by the share button
// there) — status is still visible in CalendarDetailSlideover.vue.
const isPast = computed(() => status === 'completed')
</script>

<template>
  <UCard
    class="cursor-pointer"
    :class="{ 'opacity-60 saturate-50': isPast }"
    @click="$emit('select')"
  >
    <div class="flex items-start gap-4">
      <!-- Luma-inspired: a cover image (real or a placeholder icon) takes the
           date box's spot — the date moves into a text line below the title
           instead. -->
      <div class="size-20 rounded-xl overflow-hidden shrink-0">
        <img
          v-if="image"
          :src="image"
          :alt="name"
          class="size-full object-cover"
        >
        <ImageOffPlaceholder v-else class="size-full" icon-class="size-6" />
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-semibold truncate">
            {{ name }}
          </h3>
          <div class="shrink-0" @click.stop>
            <CalendarButtonShareButton :name="name" :start-date="startDate" :show-label="false" />
          </div>
        </div>

        <p class="flex items-center gap-1 text-sm text-muted mt-1">
          <UIcon :name="ICONS.calendar" class="size-4 shrink-0" />
          <span>{{ format(new Date(startDate), 'd MMMM', { locale: it }) }}</span>
        </p>

        <slot name="meta" />

        <a
          v-if="location"
          :href="googleMapsUrl(locationAddress ?? location)"
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
      <CalendarButtonAddToCalendarButton :item="icsItem" />
      <CalendarButtonRegisterButton />
    </div>
  </UCard>
</template>
