<!-- app\components\cittadino\FiltersDropdown.vue -->
<!--
  Shared format-filter dropdown + summary text, used by
  PublicCittadinoPage.vue and standings/cittadino/index.vue (fallow:dupes
  flagged this as an identical clone). The internal page additionally wraps
  this in a `#tour-cittadino-filters` id div for the onboarding tour — that
  stays in the parent, not here.
-->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  formatItems: DropdownMenuItem[]
  isFiltered: boolean
  playerCount: number
  eventCount: number
}>()
</script>

<template>
  <div class="flex items-center gap-4 flex-wrap">
    <UDropdownMenu :items="formatItems" :content="{ align: 'start' }">
      <UButton
        :label="$t('cittadino.filters.formats')"
        color="neutral"
        :variant="isFiltered ? 'solid' : 'outline'"
        trailing-icon="i-lucide-list-filter"
      />
    </UDropdownMenu>

    <p class="text-sm text-muted">
      {{ $t('cittadino.summary', { players: playerCount, events: eventCount }) }}
      <span v-if="isFiltered" class="text-warning">
        {{ $t('cittadino.filters.recomputed') }}
      </span>
    </p>
  </div>
</template>
