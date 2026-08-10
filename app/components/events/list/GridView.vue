<!-- app\components\events\list\GridView.vue -->
<script setup lang="ts">
import { format } from 'date-fns'
import type { Event } from '~/types'

const { events } = defineProps<{
  events: Event[]
}>()

const { t } = useI18n()
</script>

<template>
  <div v-if="!events.length" class="text-center py-12 text-muted">
    {{ $t('event.grid.empty') }}
  </div>

  <div v-else class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(280px,90vw),1fr))]">
    <UCard
      v-for="event in events"
      :key="event.id"
      :to="`/events/${event.id}`"
      class="hover:ring-primary transition-colors"
    >
      <div class="flex items-start justify-between gap-2 mb-4">
        <h3 class="font-semibold truncate">
          {{ event.name }}
        </h3>
        <UBadge
          :color="eventStatusColor(event.status)"
          variant="subtle"
          :icon="EVENT_STATUS_ICONS[event.status]"
          class="shrink-0"
        >
          {{ t(`event.status.${event.status}`) }}
        </UBadge>
      </div>

      <div class="flex items-center justify-between text-sm text-muted">
        <span>{{ format(new Date(event.startDate), 'dd/MM/yyyy') }}</span>
        <span>{{ t('event.tournamentsLabel', event.tournamentCount) }}</span>
      </div>
    </UCard>
  </div>
</template>
