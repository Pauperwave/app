<!-- app\components\ui\MembershipRequestStatusBadge.vue -->
<!-- Extracted from useAssociatesTableColumns.ts's membershipRequestStatusColumn, with the same
     treatment as MembershipStatusBadge/AssociateTypeBadge/ConsentBadge/ PaymentTypeBadge, so a
     detail page can reuse it too. The optional `clickable` keeps the roster's "click to filter
     by this status" opt-in: a detail page rendering it for one associate has no column to
     filter, so it shouldn't look or act like a button there. -->
<script setup lang="ts">
import type { RequestStatus } from '~/types'

const { status, clickable = false } = defineProps<{
  status: RequestStatus
  clickable?: boolean
}>()

const { t } = useI18n()

const badge = computed(() => MEMBERSHIP_REQUEST_STATUS_BADGE_CONFIG[status] ?? { color: 'neutral' as const, icon: ICONS.help })
</script>

<template>
  <UBadge
    variant="subtle"
    :class="['capitalize gap-2', clickable && 'cursor-pointer hover:opacity-80 transition-opacity']"
    v-bind="badge"
    :label="t(`associate.statusLabels.${status}`)"
  />
</template>
