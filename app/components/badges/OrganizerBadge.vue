<!-- app\components\badges\OrganizerBadge.vue -->
<!-- An event/tournament's organizer as a neutral pill, same shape as LocationBadge.vue. -->
<script setup lang="ts">
const { organizer } = defineProps<{ organizer: string }>()
</script>

<template>
  <UBadge
    color="neutral"
    variant="subtle"
    :icon="ICONS.building"
    :label="organizer"
    :title="organizer"
    :ui="{ base: 'min-w-0', label: 'truncate min-w-0' }"
  />
</template>
