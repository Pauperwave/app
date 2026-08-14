<!-- app\components\events\AddToCalendarButton.vue -->
<!--
  Device-aware "add to calendar" action, used by CalendarCard.vue for both
  Event and Tournament cards on /calendario. A downloaded .ics is friction
  on desktop (has to be opened/imported by hand), where a one-click web link
  is the native path instead. Android gets the same web link — it opens the
  Google Calendar app directly via its own intent handling for
  calendar.google.com/calendar/render URLs, same as luma.com/Eventbrite
  (2026-08-14 decision, replacing the earlier "mobile always downloads .ics"
  behavior). iOS has no equivalent web-to-app handoff for Google Calendar, so
  it keeps the .ics download, which iOS imports straight into the system
  calendar app. See eventIcs.ts's googleCalendarUrl comment.
-->
<script lang="ts" setup>
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
