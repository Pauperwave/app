<!-- app\components\locations\single\PresentationCard.vue -->
<!--
  Extracted out of locations/[slug]/index.vue (2026-08-20), same convention as
  LeaguesSinglePresentationCard.vue — the location-detail page's own header
  card: cover image, name, edit button, address/maps link, phone, social
  links.
-->
<script setup lang="ts">
import type { Location } from '~/types'

const {
  location, mapsLink, addressLine, onEdit
} = defineProps<{
  location: Location
  mapsLink: string | null
  addressLine: string
  onEdit: (location: Location) => void
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
      </div>

      <div
        class="p-6 flex-1 min-w-0"
        :class="{ 'opacity-60 saturate-50': location.temporarilyClosed }"
      >
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-xl font-semibold truncate">
            {{ location.name }}
          </h2>

          <UButton
            :label="t('location.rowActions.edit')"
            :icon="ICONS.edit"
            color="neutral"
            variant="subtle"
            size="sm"
            class="shrink-0"
            @click="onEdit(location)"
          />
        </div>

        <p class="flex items-center gap-1.5 text-sm text-muted mt-2">
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

        <p v-if="location.phone" class="flex items-center gap-1.5 text-sm text-muted mt-1">
          <UIcon :name="ICONS.phone" class="size-4 shrink-0" />
          {{ location.phone }}
        </p>

        <LocationsListSocialLinks :location="location" />
      </div>
    </div>
  </UCard>
</template>
