<!-- app\components\events\list\Card.vue -->
<!--
  Events' own version of TournamentsListCard.vue (2026-08-22, issue #45 +
  "make presentable /events") — same cover/checkbox/edit layout and hover
  treatment, adapted to Event's fields: a location badge instead of
  format, a tournament-count footer instead of players/entry-fee (events
  have neither). Status shows through the card's own styling rather than a
  badge, same convention as leagues/tournaments: completed and cancelled
  both recede via opacity/saturation, cancelled additionally gets the
  strikethrough+error title.

  `loading`: same per-element real-vs-USkeleton branching as
  TournamentsListCard.vue — see that file's own comment for why this
  replaces a separate hand-duplicated skeleton.
-->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Event } from '~/types'
import type { Selection } from '~/composables/useSelection'

const {
  event = null, contextMenuItems, onEdit, selection, range = [], loading = false
} = defineProps<{
  event?: Event | null
  contextMenuItems?: (event: Event) => DropdownMenuItem[]
  onEdit?: (event: Event) => void
  selection?: Selection<number>
  /** The ordered list a shift-click range resolves against — see GridView.vue. */
  range?: number[]
  loading?: boolean
}>()

const { t } = useI18n()

const isMuted = computed(() => !!event && (event.status === 'completed' || event.status === 'cancelled'))
const isCancelled = computed(() => event?.status === 'cancelled')

// Same ctrl/cmd/shift-click convention as TournamentsListCard.vue. No-ops
// while loading/without a real event — nothing to click through to yet.
function onCardClick(clickEvent: MouseEvent) {
  if (!event) return
  if (clickEvent.ctrlKey || clickEvent.metaKey || clickEvent.shiftKey) {
    selection?.toggle(event.id, { shiftKey: clickEvent.shiftKey, range })
    return
  }
  navigateTo(`/events/${event.uuid}`)
}

// Same-day start/end shows a range ("20:00 - 23:00"), otherwise just the
// start time — an end date on a different day is shown via the footer's
// tournament activity instead, not crammed into this badge.
function timeLabel(current: Event) {
  const start = new Date(current.startDate)
  const startLabel = start.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  if (!current.endDate) return startLabel

  const end = new Date(current.endDate)
  if (end.toDateString() !== start.toDateString()) return startLabel

  const endLabel = end.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  return `${startLabel} - ${endLabel}`
}
</script>

<template>
  <UContextMenu :items="!loading && event ? contextMenuItems!(event) : []">
    <UCard
      class="overflow-hidden cursor-pointer group transition-all duration-300
        hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1
        hover:scale-[1.02] hover:ring-primary"
      :class="{ 'opacity-60 saturate-50': isMuted }"
      :ui="{ body: 'p-3 sm:p-3', footer: 'p-3 sm:p-3' }"
      @click="onCardClick"
    >
      <EventsListCover
        :event="event"
        :selection="selection"
        :range="range"
        :loading="loading"
      />

      <div class="flex items-start justify-between gap-2">
        <h3
          v-if="!loading && event"
          class="font-semibold truncate"
          :class="{ 'line-through text-error': isCancelled }"
        >
          {{ event.name }}
        </h3>
        <!-- Width matches "Torneo Regionale 2026" — see TournamentsListCard.vue's
             own comment for why these are sized to real content, not
             arbitrary bars. -->
        <USkeleton v-else class="h-5 w-3/4" />

        <EditIconButton
          v-if="!loading && event"
          :label="t('event.rowActions.edit')"
          size="xs"
          class="shrink-0"
          @click.stop="onEdit?.(event)"
        />
        <USkeleton v-else class="size-6 shrink-0" />
      </div>

      <div class="flex items-center gap-2 mt-1.5 flex-nowrap overflow-hidden">
        <template v-if="!loading && event">
          <UBadge
            color="neutral"
            variant="subtle"
            :icon="ICONS.clock"
            class="shrink-0"
          >
            {{ timeLabel(event) }}
          </UBadge>

          <BadgesLocationBadge
            v-if="event.location"
            :location="event.location"
            :location-address="event.locationAddress"
            :maps-url="event.locationMapsUrl"
            class="min-w-0"
          />
        </template>
        <!-- Widths match "20:00 - 23:00" (time) + "Fantàsia" (location). -->
        <template v-else>
          <USkeleton class="h-6 w-24" />
          <USkeleton class="h-6 w-20" />
        </template>
      </div>

      <template #footer>
        <div v-if="!loading && event" class="flex items-center justify-between">
          <UBadge
            color="neutral"
            variant="subtle"
            :icon="ICONS.battle"
          >
            {{ t('event.tournamentsLabel', event.tournamentCount) }}
          </UBadge>
        </div>
        <div v-else class="flex items-center justify-between">
          <USkeleton class="h-6 w-24" />
        </div>
      </template>
    </UCard>
  </UContextMenu>
</template>
