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
    :ui="{
      // Always 0 now (user request, 2026-08-19): the cover area is no
      // longer conditional on having a real image — ImageOffPlaceholder.vue
      // fills the same footprint when there isn't one, same convention as
      // tournaments/list/Cover.vue, so the image/placeholder still bleeds
      // to the card's edge either way.
      body: 'p-0 sm:p-0 flex-1',
      // No flex-wrap (user request, 2026-08-19): a wrapped second line made
      // cards in the same grid row uneven heights. overflow-x-auto instead —
      // scrolls sideways on a narrow card with all three badges rather than
      // breaking onto a second line. py-2 overrides UCard's default footer
      // p-4 (too much vertical padding for a row of compact badges, same
      // user request) — px-4 sm:px-6 keeps the default's own horizontal
      // breakpoint instead of just dropping it.
      footer: 'flex items-center gap-2 overflow-x-auto px-4 py-2 sm:px-4'
    }"
  >
    <!-- Not inside the opacity-60 wrapper below: CSS opacity applies to a
         whole subtree, a descendant can't opt back out of an ancestor's
         opacity — the badge has to be a sibling, not a child, of the faded
         content to render at full strength on top of it (user request,
         2026-08-19; previously the badge announcing "closed" was itself the
         thing getting faded out). -->
    <LocationsListLocationStatus :temporarily-closed="location.temporarilyClosed" />

    <div :class="{ 'opacity-60 saturate-50': location.temporarilyClosed }">
      <img
        v-if="location.image"
        :src="location.image"
        :alt="location.name"
        class="w-full h-32 object-cover rounded-t-[calc(var(--ui-radius)*2)]"
      >
      <ImageOffPlaceholder
        v-else
        class="w-full h-32 rounded-t-[calc(var(--ui-radius)*2)]"
        icon-class="size-8"
      />

      <div class="p-4">
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
    </div>

    <template #footer>
      <UBadge
        v-if="location.phone"
        color="neutral"
        variant="subtle"
        class="shrink-0"
        :class="{ 'opacity-60 saturate-50': location.temporarilyClosed }"
        :icon="ICONS.phone"
      >
        {{ location.phone }}
      </UBadge>

      <a
        :href="mapsLink"
        target="_blank"
        rel="noopener noreferrer"
        class="shrink-0"
        :class="{ 'opacity-60 saturate-50': location.temporarilyClosed }"
      >
        <UBadge color="neutral" variant="subtle" :icon="ICONS.mapPin">
          {{ t('location.card.openInMaps') }}
        </UBadge>
      </a>
    </template>
  </UCard>
</template>
