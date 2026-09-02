<!-- app\components\events\StatusBadge.vue -->
<!--
  Thin event-domain wrapper around ui/StatusChangeBadge.vue, same shape as
  tournaments/StatusBadge.vue and leagues/StatusBadge.vue.
  manage-tournaments, not a dedicated manage-events permission: none exists
  (app/utils/permissions.ts) — same "organizer manages competitions"
  capability every domain relies on server-side (requireManagementPermission),
  see leagues/StatusBadge.vue's own comment.
-->
<script setup lang="ts">
import type { BadgeProps } from '@nuxt/ui'
import type { Event } from '~/types'

const { event, variant } = defineProps<{
  event: Event
  variant?: BadgeProps['variant']
}>()
const { t } = useI18n()
const { setStatus } = useEventsMutations()
</script>

<template>
  <StatusChangeBadge
    :id="event.id"
    :status="event.status"
    :statuses="EVENT_STATUSES"
    :icons="EVENT_STATUS_ICONS"
    :color="eventStatusColor"
    :label="(status) => t(`event.status.${status}`)"
    permission="manage-tournaments"
    :error-title="t('event.statusChangeErrorTitle')"
    :mutate-async="setStatus.mutateAsync"
    :variant="variant"
  />
</template>
