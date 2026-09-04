<!-- app\components\locations\list\Card.vue -->
<!--
  `loading` (2026-08-22): same per-element real-vs-USkeleton branching as
  TournamentsListCard.vue — see that file's own comment for why this
  replaces a separate hand-duplicated skeleton. Right-click menu added
  2026-08-23 (copy link/id + edit, same as EventsListCard.vue's own
  UContextMenu wrapper) — no selection/range wiring though, locations has no
  bulk actions, so this stays a single file instead of splitting into its
  own Cover.vue.
-->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Location } from '~/types'

const {
  location = null, contextMenuItems, onEdit, loading = false
} = defineProps<{
  location?: Location | null
  contextMenuItems?: (location: Location) => DropdownMenuItem[]
  onEdit?: (location: Location) => void
  loading?: boolean
}>()

const { t } = useI18n()

// "Viale Trento, 47/49, 38068 Rovereto TN" — same order as the form fields
// and the maps-preview query (2026-08-16 user request).
const addressLine = computed(() => location
  ? `${location.address}, ${location.postalCode} ${location.city} ${location.province}`
  : '')

// Same "whole card navigates, interactive children stop propagation"
// convention as LeaguesListCard.vue/TournamentsListCard.vue — the location
// detail page (2026-08-19) is the first place to land on from this grid.
// No-op while loading/without a real location — nothing to click through
// to yet.
function onCardClick() {
  if (!location) return
  navigateTo(`/locations/${slugify(location.name)}`)
}

// The precise Google Maps place link takes priority over the generic
// address-search fallback when set (see the googleMapsUrl column added
// 2026-08-16 specifically because the address-search link isn't always
// accurate — supabase/migrations/20260816120000_add_locations_google_maps_url.sql).
const mapsLink = computed(() => location
  ? (location.googleMapsUrl ?? googleMapsUrl(location.address))
  : undefined)
</script>

<template>
  <UContextMenu :items="!loading && location ? contextMenuItems!(location) : []">
    <UCard
      class="relative flex flex-col h-full cursor-pointer transition-all duration-300 hover:shadow-xl
      hover:shadow-primary/10 hover:-translate-y-1"
      :ui="{
        body: 'p-0 sm:p-0 flex-1',
        footer: 'flex items-center gap-2 overflow-x-auto px-4 py-2 sm:px-4'
      }"
      @click="onCardClick"
    >
      <!-- Sibling of the dimmed content below, not a child — same
           top-left-vs-top-right mirror of LocationsListLocationStatus's own
           absolute positioning (user request, 2026-09-04). -->
      <LocationsTypeBadge
        v-if="!loading && location"
        :is-shop="location.isShop"
        class="absolute top-2 left-2 z-10"
      />

      <!-- Not inside the opacity-60 wrapper below: CSS opacity applies to a
         whole subtree, a descendant can't opt back out of an ancestor's
         opacity — the badge has to be a sibling, not a child, of the faded
         content to render at full strength on top of it (user request,
         2026-08-19; previously the badge announcing "closed" was itself the
         thing getting faded out). -->
      <LocationsListLocationStatus
        v-if="!loading && location"
        :temporarily-closed="location.temporarilyClosed"
      />

      <div :class="{ 'opacity-60 saturate-50': !loading && location && location.temporarilyClosed }">
        <template v-if="!loading && location">
          <NuxtImg
            v-if="location.image"
            :src="location.image"
            :alt="location.name"
            format="webp"
            width="640"
            height="128"
            class="w-full h-32 object-cover rounded-t-[calc(var(--ui-radius)*2)]"
          />
          <ImageOffPlaceholder
            v-else
            class="w-full h-32 rounded-t-[calc(var(--ui-radius)*2)]"
            icon-class="size-8"
          />
        </template>
        <USkeleton v-else class="w-full h-32 rounded-b-none rounded-t-[calc(var(--ui-radius)*2)]" />

        <div class="p-4">
          <div class="flex items-start justify-between gap-2">
            <div v-if="!loading && location">
              <h3 class="font-semibold truncate">
                {{ location.name }}
              </h3>
            </div>
            <!-- Width matches "Smart Lab Rovereto" — a typical location name. -->
            <USkeleton v-else class="h-5 w-32" />

            <UButton
              v-if="!loading && location"
              :icon="ICONS.edit"
              color="neutral"
              variant="ghost"
              size="xs"
              class="shrink-0"
              :aria-label="t('location.rowActions.edit')"
              @click.stop="onEdit?.(location)"
            />
            <USkeleton v-else class="size-6 shrink-0" />
          </div>

          <p v-if="!loading && location" class="flex items-center gap-1.5 text-sm text-muted mt-1">
            <UIcon :name="ICONS.mapPin" class="size-4 shrink-0" />
            <span class="truncate">{{ addressLine }}</span>
          </p>
          <!-- Width matches "Via Roma, 12, 38068 Rovereto TN". -->
          <USkeleton v-else class="h-4 w-44 mt-1" />

          <LocationsListSocialLinks
            v-if="!loading && location"
            :location="location"
            @click.stop
          />
          <!-- Optional on a real card (0-5 icons, none shown at all if unset)
             — same guess tradeoff as the footer's phone badge below: a
             typical-looking row rather than a pixel-exact one. -->
          <div v-else class="flex items-center gap-3 mt-2">
            <USkeleton
              v-for="n in 3"
              :key="n"
              class="size-4 rounded-full"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <template v-if="!loading && location">
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
            @click.stop
          >
            <UBadge
              color="neutral"
              variant="subtle"
              :icon="ICONS.mapPin"
            >
              {{ t('location.card.openInMaps') }}
            </UBadge>
          </a>
        </template>
        <!-- Phone is optional on a real card (so this is a guess, unlike the
           maps badge which is always present) — same tradeoff tournaments'
           own optional location badge accepts in its skeleton. -->
        <template v-else>
          <USkeleton class="h-6 w-24" />
          <USkeleton class="h-6 w-28" />
        </template>
      </template>
    </UCard>
  </UContextMenu>
</template>
