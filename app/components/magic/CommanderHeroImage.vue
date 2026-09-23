<!-- app\components\magic\CommanderHeroImage.vue -->
<!-- The hero art block for a Commander deck's detail card — a single image,
     or split in two when there's a partner. `alt2` (not `art2`) drives the
     split, since it mirrors whether a second commander exists at all,
     independent of whether its own art has resolved yet — keying off
     `art2` would un-split the layout mid-load and shift it back. Shared by
     statistics/decks/[deckSlug].vue and players/.../deck/[deckSlug].vue,
     which independently duplicated this exact markup (fallow:dupes,
     2026-09-23). Not used by statistics/commanders/[commanderSlug].vue,
     which only ever shows one commander (no partner slot on that page). -->
<script setup lang="ts">
const {
  art1,
  alt1,
  art2 = null,
  alt2 = null,
  loading = false
} = defineProps<{
  art1: string | null
  alt1: string
  art2?: string | null
  alt2?: string | null
  loading?: boolean
}>()
</script>

<template>
  <div class="aspect-video bg-muted" :class="alt2 ? 'flex' : ''">
    <ImageWithFallback
      :src="art1"
      :alt="alt1"
      :loading="loading"
      :class="alt2 ? 'flex-1' : ''"
    />
    <ImageWithFallback
      v-if="alt2"
      :src="art2"
      :alt="alt2"
      :loading="loading"
      class="flex-1"
    />
  </div>
</template>
