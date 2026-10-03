<!-- app\components\calendar\button\AddToCalendarButton.vue -->
<!-- Device-aware "add to calendar" action, used by CalendarCard.vue for Event and Tournament
     cards on /calendario. A downloaded .ics is friction on desktop (it has to be
     opened/imported by hand), where a one-click web link is the native path. Android gets the
     same web link: it opens the Google Calendar app through its intent handling for
     calendar.google.com/calendar/render URLs, like luma.com/Eventbrite. iOS has no web-to-app
     handoff for Google Calendar, so it keeps the .ics download, which iOS imports into the
     system calendar app. See eventIcs.ts's googleCalendarUrl comment. -->
<script lang="ts" setup>
// fallow-ignore-file security-sink -- fixed Google origin, params encoded by URLSearchParams
import type { CalendarIcsItem } from '~/utils/events/eventIcs'

interface Props {
  item: CalendarIcsItem
}

const { item } = defineProps<Props>()

const { isIos } = useDevice()

function addToCalendar() {
  if (isIos) {
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
