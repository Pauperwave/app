<!-- app\components\associates\single\MembershipHistoryCard.vue -->
<script setup lang="ts">
const { associateUuid } = defineProps<{ associateUuid: string }>()

const { data: membershipEvents, isLoading: membershipEventsLoading }
  = useAssociateMembershipEventsQuery(() => associateUuid)
</script>

<template>
  <UCard :ui="{ header: 'font-semibold' }">
    <template #header>
      {{ $t('associate.detail.sections.membershipHistory') }}
    </template>

    <USkeleton v-if="membershipEventsLoading" class="h-24 w-full" />
    <AssociatesSingleMembershipTimeline v-else :events="membershipEvents ?? []" />
  </UCard>
</template>
