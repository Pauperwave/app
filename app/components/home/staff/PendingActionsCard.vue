<!-- app\components\home\staff\PendingActionsCard.vue -->
<!-- Split out of home/Staff.vue (2026-08-29, fallow:health) — one of six
     self-contained dashboard card sections that had made Staff.vue's
     template a complexity hotspot. -->
<script setup lang="ts">
interface PendingAction {
  label: string
  count: number
  icon: string
  to: string
}

defineProps<{ actions: PendingAction[] }>()
</script>

<template>
  <UPageCard
    id="tour-home-pending-actions"
    :title="$t('home.staff.pendingActions.title')"
    variant="subtle"
  >
    <div class="flex flex-col divide-y divide-default">
      <NuxtLink
        v-for="action in actions"
        :key="action.label"
        :to="action.to"
        class="flex items-center justify-between gap-3 -mx-2 px-2 py-3 first:pt-0 last:pb-0
          rounded-md hover:bg-elevated/50 hover:text-highlighted"
      >
        <span class="flex items-center gap-2 text-sm">
          <UIcon :name="action.icon" class="size-4 text-muted shrink-0" />
          {{ action.label }}
        </span>
        <UBadge
          :color="action.count > 0 ? 'warning' : 'neutral'"
          variant="subtle"
          class="shrink-0"
        >
          {{ action.count }}
        </UBadge>
      </NuxtLink>
    </div>
  </UPageCard>
</template>
