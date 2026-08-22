<!-- app\components\locations\single\PresentationCard.vue -->
<!--
  Extracted out of locations/[slug]/index.vue (2026-08-20), same convention as
  LeaguesSinglePresentationCard.vue — the location-detail page's own header
  card: cover image, name, edit button, address/maps link, phone, social
  links.

  `loading` (2026-08-22): same per-element real-vs-USkeleton branching as
  LocationsListCard.vue — the detail page's top shell used to sit behind a
  full-page spinner instead of getting its own skeleton, unlike the
  tournaments grid below it (already fixed the same session).
-->
<script setup lang="ts">
import type { Location } from '~/types'

const {
  location = null, mapsLink = null, addressLine = '', onEdit, loading = false
} = defineProps<{
  location?: Location | null
  mapsLink?: string | null
  addressLine?: string
  onEdit?: (location: Location) => void
  loading?: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }" class="overflow-hidden">
    <div class="flex flex-col sm:flex-row">
      <!-- Sibling of the dimmed img/placeholder, not a descendant: CSS
           opacity applies to a whole subtree, so the badge has to sit
           outside it to render at full strength on top (same fix as
           the grid card's own LocationsListLocationStatus). -->
      <div class="relative shrink-0 w-full sm:w-64">
        <template v-if="!loading && location">
          <img
            v-if="location.image"
            :src="location.image"
            :alt="location.name"
            class="w-full h-48 sm:h-full object-cover"
            :class="{ 'opacity-60 saturate-50': location.temporarilyClosed }"
          >
          <ImageOffPlaceholder
            v-else
            class="w-full h-48 sm:h-full"
            :class="{ 'opacity-60 saturate-50': location.temporarilyClosed }"
            icon-class="size-10"
          />

          <UBadge
            v-if="location.temporarilyClosed"
            color="warning"
            variant="subtle"
            :icon="ICONS.warning"
            class="absolute top-2 left-2 z-10"
          >
            {{ t('location.card.temporarilyClosed') }}
          </UBadge>
        </template>
        <USkeleton v-else class="w-full h-48 sm:h-full rounded-none" />
      </div>

      <div
        class="p-6 flex-1 min-w-0"
        :class="{ 'opacity-60 saturate-50': !loading && location && location.temporarilyClosed }"
      >
        <div class="flex items-start justify-between gap-3">
          <h2 v-if="!loading && location" class="text-xl font-semibold truncate">
            {{ location.name }}
          </h2>
          <!-- Width matches "Smart Lab Rovereto". -->
          <USkeleton v-else class="h-6 w-48" />

          <UButton
            v-if="!loading && location"
            :label="t('location.rowActions.edit')"
            :icon="ICONS.edit"
            color="neutral"
            variant="subtle"
            size="sm"
            class="shrink-0"
            @click="onEdit?.(location)"
          />
          <USkeleton v-else class="h-8 w-28 shrink-0" />
        </div>

        <p v-if="!loading && location" class="flex items-center gap-1.5 text-sm text-muted mt-2">
          <UIcon :name="ICONS.mapPin" class="size-4 shrink-0" />
          <span>{{ addressLine }}</span>
          <a
            v-if="mapsLink"
            :href="mapsLink"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary hover:underline"
          >
            {{ t('location.card.openInMaps') }}
          </a>
        </p>
        <!-- Width matches "Via Roma, 12, 38068 Rovereto TN". -->
        <USkeleton v-else class="h-4 w-56 mt-2" />

        <p
          v-if="!loading && location && location.phone"
          class="flex items-center gap-1.5 text-sm text-muted mt-1"
        >
          <UIcon :name="ICONS.phone" class="size-4 shrink-0" />
          {{ location.phone }}
        </p>
        <!-- Optional on a real card — same guess tradeoff as the grid
             card's own footer badges. -->
        <USkeleton v-else-if="loading" class="h-4 w-32 mt-1" />

        <LocationsListSocialLinks v-if="!loading && location" :location="location" />
        <div v-else class="flex items-center gap-3 mt-2">
          <USkeleton v-for="n in 3" :key="n" class="size-4 rounded-full" />
        </div>
      </div>
    </div>
  </UCard>
</template>
