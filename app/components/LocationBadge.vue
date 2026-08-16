<!-- app\components\LocationBadge.vue -->
<!--
  A tournament/event's venue as a clickable pill linking out to Google Maps —
  extracted out of tournaments/list/Card.vue (2026-08-16), same "single
  source of truth" reasoning as FormatBadge.vue.
-->
<script setup lang="ts">
const { location, locationAddress = null, mapsUrl = null } = defineProps<{
  location: string
  locationAddress?: string | null
  /** locations.google_maps_url — precise place link, takes priority over
   *  the generic address-search fallback when set. */
  mapsUrl?: string | null
}>()

// Venue names carry a " - <full address/room>" suffix (e.g. "Smart Lab -
// Centro Giovani Rovereto", see locations table) — only the short name
// fits/reads well as a badge, the full name is still in the href/tooltip.
const shortLocation = computed(() => location.split(' - ')[0])
</script>

<template>
  <a
    :href="mapsUrl ?? googleMapsUrl(locationAddress ?? location)"
    target="_blank"
    rel="noopener noreferrer"
    class="inline-flex w-fit"
    :title="location"
    @click.stop
  >
    <UBadge color="neutral" variant="subtle" :icon="ICONS.mapPin">
      {{ shortLocation }}
    </UBadge>
  </a>
</template>
