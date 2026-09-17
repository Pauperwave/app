<!-- app\components\commanders\CommanderDenseCard.vue -->
<!-- Dense grid tile for /statistics/commanders (third view mode alongside
     table/grid) — single-art thumbnail + name only, same "row optional +
     loading renders this same tile's own skeleton" convention as
     DeckDenseCard.vue/TournamentsListDenseCard.vue. -->
<script setup lang="ts">
interface CommanderDenseRow {
  name: string
  manaCost: string | null
  artCropUrl: string | null
}

const { row = null, loading = false } = defineProps<{
  row?: CommanderDenseRow | null
  loading?: boolean
}>()

const commanderSlug = computed(() => row ? slugify(row.name) : '')
</script>

<template>
  <NuxtLink v-if="!loading && row" :to="`/statistics/commanders/${commanderSlug}`">
    <UCard
      class="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      :ui="{ body: 'p-0 sm:p-0' }"
    >
      <div class="aspect-square">
        <TournamentsSinglePairingCommanderArt
          :card-name="row.name"
          :art-url="row.artCropUrl"
          :mana-cost="row.manaCost ?? undefined"
          size="sm"
        />
      </div>
    </UCard>
  </NuxtLink>

  <UCard
    v-else
    class="overflow-hidden"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <USkeleton class="aspect-square w-full" />
  </UCard>
</template>
