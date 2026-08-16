<!-- app\components\locations\list\MapPreview.vue -->
<script setup lang="ts">
// Leaflet + OpenStreetMap tiles, same convention as AssociatesListMapView.vue
// — no API key, replacing the earlier Google Maps "output=embed" iframe hack.
const { address } = defineProps<{ address: string }>()

const addressRef = toRef(() => address)
const { coords, isGeocoding } = useAddressGeocode(addressRef)
</script>

<template>
  <div
    v-if="coords || isGeocoding"
    class="overflow-hidden rounded-lg border border-default h-48 relative"
  >
    <div
      v-if="isGeocoding"
      class="absolute inset-0 z-10 flex items-center justify-center bg-default/60"
    >
      <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl text-muted" />
    </div>

    <ClientOnly>
      <LMap
        v-if="coords"
        :zoom="16"
        :center="coords"
        :use-global-leaflet="false"
        style="height: 100%; width: 100%; z-index: 0;"
      >
        <LTileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; <a href=&quot;https://www.openstreetmap.org/&quot;>OpenStreetMap</a> contributors"
          layer-type="base"
          name="OpenStreetMap"
        />
        <LMarker :lat-lng="coords" />
      </LMap>
    </ClientOnly>
  </div>
</template>
