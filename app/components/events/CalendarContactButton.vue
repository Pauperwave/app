<!-- app\components\events\CalendarContactButton.vue -->
<!--
  Tappable phone number for the calendar's contact person, used in
  CalendarFooter.vue (/calendario). First name only ("Nicola", not the
  surname), per the user's request 2026-08-14.
-->
<script lang="ts" setup></script>

<template>
  <UButton
    to="tel:35188033399"
    :icon="ICONS.phone"
    :label="`${$t('event.calendar.contact')}: Nicola`"
    color="neutral"
    variant="ghost"
    size="sm"
  />
</template>
