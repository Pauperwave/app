<!-- app\components\events\CalendarWebsiteButton.vue -->
<!-- Link to pauperwave.com, used in CalendarFooter.vue (/calendario). -->
<script lang="ts" setup></script>

<template>
  <UButton
    to="https://pauperwave.com"
    target="_blank"
    :icon="ICONS.globe"
    label="pauperwave.com"
    color="neutral"
    variant="ghost"
    size="sm"
  />
</template>
