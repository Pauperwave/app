<!-- app\components\locations\list\Card.vue -->
<script setup lang="ts">
import type { Location } from '~/types'

const { location, onEdit } = defineProps<{
  location: Location
  onEdit: (location: Location) => void
}>()

const { t } = useI18n()

// "Viale Trento, 47/49, 38068 Rovereto TN" — same order as the form fields
// and the maps-preview query (2026-08-16 user request).
const addressLine = computed(() =>
  `${location.address}, ${location.postalCode} ${location.city} ${location.province}`)

// The precise Google Maps place link takes priority over the generic
// address-search fallback when set (see the googleMapsUrl column added
// 2026-08-16 specifically because the address-search link isn't always
// accurate — supabase/migrations/20260816120000_add_locations_google_maps_url.sql).
const mapsLink = computed(() => location.googleMapsUrl ?? googleMapsUrl(location.address))
</script>

<template>
  <UCard
    class="relative flex flex-col h-full transition-all duration-300 hover:shadow-xl
      hover:shadow-primary/10 hover:-translate-y-1"
    :class="{ 'opacity-60 saturate-50': location.temporarilyClosed }"
    :ui="{
      body: location.image ? 'p-0 sm:p-0 flex-1' : 'flex-1',
      footer: 'flex items-center gap-2 flex-wrap'
    }"
  >
    <LocationsListLocationStatus :temporarily-closed="location.temporarilyClosed" />

    <img
      v-if="location.image"
      :src="location.image"
      :alt="location.name"
      class="w-full h-32 object-cover rounded-t-[calc(var(--ui-radius)*2)]"
    >

    <div :class="location.image ? 'p-4' : ''">
      <div class="flex items-start justify-between gap-2">
        <h3 class="font-semibold truncate">
          {{ location.name }}
        </h3>

        <UButton
          :icon="ICONS.edit"
          color="neutral"
          variant="ghost"
          size="xs"
          class="shrink-0"
          :aria-label="t('location.rowActions.edit')"
          @click="onEdit(location)"
        />
      </div>

      <p class="flex items-center gap-1.5 text-sm text-muted mt-1">
        <UIcon :name="ICONS.mapPin" class="size-4 shrink-0" />
        <span class="truncate">{{ addressLine }}</span>
      </p>

      <LocationsListSocialLinks :location="location" />
    </div>

    <template #footer>
      <UBadge
        v-if="location.phone"
        color="neutral"
        variant="subtle"
        :icon="ICONS.phone"
      >
        {{ location.phone }}
      </UBadge>

      <a
        v-if="location.website"
        :href="location.website"
        target="_blank"
        rel="noopener noreferrer"
      >
        <UBadge color="neutral" variant="subtle" :icon="ICONS.globe">
          {{ t('location.card.website') }}
        </UBadge>
      </a>

      <a :href="mapsLink" target="_blank" rel="noopener noreferrer">
        <UBadge color="neutral" variant="subtle" :icon="ICONS.mapPin">
          {{ t('location.card.openInMaps') }}
        </UBadge>
      </a>
    </template>
  </UCard>
</template>
