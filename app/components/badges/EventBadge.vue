<!-- app\components\badges\EventBadge.vue -->
<!-- A tournament's parent event as a clickable pill linking to its detail page, same shape as LeagueBadge.vue. -->
<script setup lang="ts">
const { event, eventUuid } = defineProps<{
  event: string
  eventUuid: string
}>()
</script>

<template>
  <button
    type="button"
    class="inline-flex min-w-0"
    @click.stop="navigateTo(`/events/${eventUuid}`)"
  >
    <UBadge
      color="neutral"
      variant="subtle"
      :icon="ICONS.calendar"
      :label="event"
      :ui="{ base: 'min-w-0', label: 'truncate min-w-0' }"
    />
  </button>
</template>
