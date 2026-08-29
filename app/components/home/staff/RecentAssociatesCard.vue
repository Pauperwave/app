<!-- app\components\home\staff\RecentAssociatesCard.vue -->
<!-- Split out of home/Staff.vue (2026-08-29, fallow:health) — see
     PendingActionsCard.vue's own comment. -->
<script setup lang="ts">
import type { Associate } from '~/types'

defineProps<{ associates: Associate[] }>()
</script>

<template>
  <UPageCard
    id="tour-home-recent-associates"
    :title="$t('home.staff.recentAssociates.title')"
    variant="subtle"
  >
    <div v-if="!associates.length" class="text-sm text-muted py-4 text-center">
      {{ $t('home.staff.recentAssociates.empty') }}
    </div>

    <div v-else class="flex flex-col divide-y divide-default">
      <NuxtLink
        v-for="associate in associates"
        :key="associate.uuid"
        :to="`/associate/${slugify(`${associate.first_name} ${associate.last_name}`)}`"
        class="flex items-center justify-between gap-3 -mx-2 px-2 py-3 first:pt-0 last:pb-0
          rounded-md hover:bg-elevated/50 hover:text-highlighted"
      >
        <AssociateTag
          :name="`${associate.first_name} ${associate.last_name}`"
          :associate-uuid="associate.uuid"
        />
        <DateWithRelativeTooltip
          :iso-string="associate.association_date"
          :time="false"
          class="text-sm text-muted shrink-0"
        />
      </NuxtLink>
    </div>
  </UPageCard>
</template>
