<!-- app\components\events\AddToCalendarButton.vue -->
<!--
  Device-aware "add to calendar" action, used by CalendarCard.vue for both
  Event and Tournament cards on /calendario. A downloaded .ics is friction
  on desktop (has to be opened/imported by hand), where a one-click web link
  is the native path instead — mobile keeps the .ics since iOS/Android both
  import it straight into the system calendar app. See eventIcs.ts's
  googleCalendarUrl comment.
-->
<script lang="ts" setup>
import type { CalendarIcsItem } from '~/utils/events/eventIcs'

interface Props {
  item: CalendarIcsItem
}

const { item } = defineProps<Props>()

const { isMobile } = useDevice()

function addToCalendar() {
  if (isMobile) {
    downloadEventIcs(item)
  } else {
    window.open(googleCalendarUrl(item), '_blank', 'noopener')
  }
}
</script>

<template>
  <UButton
    :label="$t('event.calendar.addToCalendar')"
    :icon="ICONS.calendarAdd"
    color="neutral"
    variant="subtle"
    size="sm"
    @click="addToCalendar"
  />
</template>
