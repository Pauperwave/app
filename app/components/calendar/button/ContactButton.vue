<!-- app\components\calendar\button\ContactButton.vue -->
<!-- Tappable phone number for the calendar's contact person, used in CalendarFooter.vue
     (/calendario). First name only, not the surname. -->
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
