<!-- app\components\associates\list\MapView.vue -->
<script setup lang="ts">
import type { Associate } from '~/types'
import type { AssociateGeocode } from '~/composables/associates/useAssociateGeocodesQuery'

const { associates, geocodes, loading = false } = defineProps<{
  associates: Associate[]
  geocodes: AssociateGeocode[]
  loading?: boolean
}>()

// Centro/zoom calibrati sull'Italia intera.
const italyCenter: [number, number] = [41.8719, 12.5674]
const italyZoom = 6

const markers = computed(() => {
  const geocodeByUuid = new Map(geocodes.map(geocode => [geocode.associate_uuid, geocode]))

  return associates
    .map((associate) => {
      const geocode = geocodeByUuid.get(associate.uuid)
      return geocode ? { associate, geocode } : null
    })
    .filter((marker): marker is { associate: Associate, geocode: AssociateGeocode } =>
      marker !== null)
})

const missingCount = computed(() => associates.length - markers.value.length)
</script>

<template>
  <div class="flex flex-col gap-4">
    <UAlert
      v-if="!loading && missingCount > 0"
      icon="i-lucide-map-pin-off"
      color="neutral"
      variant="subtle"
      :title="$t('associate.map.missingCoordinates', missingCount)"
    />

    <ClientOnly>
      <LMap
        :zoom="italyZoom"
        :center="italyCenter"
        :use-global-leaflet="false"
        style="height: 1000px; width: 100%; border-radius: var(--ui-radius-md, 0.5rem); z-index: 0;"
      >
        <LTileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; <a href=&quot;https://www.openstreetmap.org/&quot;>OpenStreetMap</a> contributors"
          layer-type="base"
          name="OpenStreetMap"
        />

        <LMarker
          v-for="marker in markers"
          :key="marker.associate.uuid"
          :lat-lng="[marker.geocode.latitude, marker.geocode.longitude]"
        >
          <LPopup>
            <div class="flex items-center gap-4 min-w-48">
              <UAvatar
                :src="generatePlayerAvatar(marker.associate.id)"
                :alt="`${marker.associate.first_name} ${marker.associate.last_name}`"
                size="lg"
              />
              <div class="flex flex-col gap-1">
                <NuxtLink
                  :to="`/associate/${
                    slugify(`${marker.associate.first_name} ${marker.associate.last_name}`)
                  }`"
                  class="font-semibold hover:underline"
                >
                  {{ marker.associate.first_name }} {{ marker.associate.last_name }}
                </NuxtLink>
                <UBadge
                  variant="subtle"
                  class="capitalize gap-4 w-fit"
                  v-bind="getMembershipStatusBadge(marker.associate.membership_status)"
                >
                  {{ marker.associate.membership_status.replace('_', ' ') }}
                </UBadge>
              </div>
            </div>
          </LPopup>
        </LMarker>
      </LMap>

      <template #fallback>
        <div class="flex items-center justify-center h-150">
          <UIcon name="i-lucide-loader-circle" class="animate-spin text-3xl text-muted" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
