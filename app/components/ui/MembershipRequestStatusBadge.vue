<!-- app\components\ui\MembershipRequestStatusBadge.vue -->
<!--
  Extracted 2026-08-19 out of useAssociatesTableColumns.ts's
  membershipRequestStatusColumn — same MembershipStatusBadge/AssociateTypeBadge/
  ConsentBadge/PaymentTypeBadge treatment, so this is ready to reuse the
  moment a detail page needs it too, not just the roster/requests table.
  Optional `clickable` keeps the roster's "click to filter by this status"
  behavior opt-in — a detail page rendering this for a single associate has
  no column to filter, so it shouldn't look/act like a button there.
-->
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
