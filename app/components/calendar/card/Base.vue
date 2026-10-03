<!-- app\components\calendar\card\Base.vue -->
<!-- Shared shell for /calendario's mixed timeline (see PublicCalendarPage.vue): the
     image/date-box, title, status badge and location line are identical whether the card is an
     Event or a standalone Tournament; only the body below the shared header differs, supplied
     by CalendarEventCard.vue / CalendarTournamentCard.vue via the #body (inline, next to the
     header) and #footer (full-width, below it) slots. "Aggiungi al calendario" is
     AddToCalendarButton.vue, which owns its device-aware behavior. Tapping anywhere else emits
     `select`, which the two variants turn into opening CalendarDetailSlideover.vue via
     useCalendarDetail.ts; the button's wrapper stops propagation so tapping it doesn't also
     open the slideover. -->
<script lang="ts" setup>
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import type { CalendarIcsItem } from '~/utils/events/eventIcs'
import type { EventStatus, Tournament, TournamentStatus } from '~/types'

interface Props {
  name: string
  startDate: string
  // Only set by Tournament.vue — Event.vue has no real event-level
  // registration yet (RegisterButton.vue's own header comment), so it never
  // passes one and the button there stays the "coming soon" placeholder.
  tournament?: Tournament | null
  // Shared by Event and Tournament cards, which have independently evolving status vocabularies
  // (migration 20260815100000): only the 'completed' literal common to both is compared here, but
  // the union (not a bare string) costs nothing
  status: EventStatus | TournamentStatus
  // Nullable: not every tournament has a location_uuid yet. locationAddress feeds the maps link
  // when present (more precise than the venue name); falls back to `location`
  location: string | null
  locationAddress?: string | null
  image: string | null
  icsItem: CalendarIcsItem
  participants?: string[]
}

const {
  name,
  startDate,
  tournament = null,
  status,
  location,
  locationAddress = null,
  image,
  icsItem,
  participants = []
} = defineProps<Props>()

defineEmits<{ select: [] }>()

const { t } = useI18n()

// A completed (past) card is muted instead of colored, so the timeline recedes as it scrolls back.
// The status badge was dropped from the header corner (replaced by the share button): status is
// still in CalendarDetailSlideover.vue
const isPast = computed(() => status === 'completed')
</script>

<template>
  <UCard
    class="cursor-pointer"
    :class="{ 'opacity-60 saturate-50': isPast }"
    @click="$emit('select')"
  >
    <div class="flex items-start gap-4">
      <!-- Luma-inspired: a cover image (real or placeholder icon) takes the date box's spot,
           and the date moves into a text line below the title -->
      <div class="size-20 rounded-xl overflow-hidden shrink-0">
        <NuxtImg
          v-if="image"
          :src="image"
          :alt="name"
          format="webp"
          width="80"
          height="80"
          class="size-full object-cover"
        />
        <ImageOffPlaceholder
          v-else
          class="size-full"
          icon-class="size-6"
        />
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-semibold truncate">
            {{ name }}
          </h3>
          <div class="shrink-0" @click.stop>
            <CalendarButtonShareButton
              :name="name"
              :start-date="startDate"
              :show-label="false"
            />
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
      <CalendarButtonRegisterButton :tournament="tournament" />
    </div>
  </UCard>
</template>
