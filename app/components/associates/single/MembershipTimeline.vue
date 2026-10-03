<!-- app\components\associates\single\MembershipTimeline.vue -->
<!-- pauperwave_associate_membership_events rendered as a UTimeline
     (https://ui.nuxt.com/components/timeline) on /associate/[slug].vue: the append-only history
     pauperwave_associates can't show, being a single mutable row -->
<script setup lang="ts">
import { format, parseISO } from 'date-fns'
import type { MembershipEventType } from '#shared/types/associates'
import type { AssociateMembershipEvent } from '~/composables/associates/useAssociateMembershipEventsQuery'

const { events } = defineProps<{ events: AssociateMembershipEvent[] }>()

const { t } = useI18n()

const EVENT_ICONS: Record<MembershipEventType, string> = {
  requested: ICONS.calendarAdd,
  approved: ICONS.playerConfirmed,
  renewal_requested: ICONS.calendarRenew,
  renewal_approved: ICONS.playerConfirmed
}

const EVENT_TITLE_KEYS: Record<MembershipEventType, string> = {
  requested: 'associate.detail.membershipHistory.requested',
  approved: 'associate.detail.membershipHistory.approved',
  renewal_requested: 'associate.detail.membershipHistory.renewalRequested',
  renewal_approved: 'associate.detail.membershipHistory.renewalApproved'
}

// Oldest-first from the query, reversed here: a timeline reads top (most recent) to bottom, like an
// activity feed
const timelineItems = computed(() => [...events].reverse().map(event => ({
  title: t(EVENT_TITLE_KEYS[event.eventType]),
  description: format(parseISO(event.occurredAt), 'dd/MM/yyyy HH:mm'),
  icon: EVENT_ICONS[event.eventType]
})))
</script>

<template>
  <p v-if="!events.length" class="text-sm text-muted py-4 text-center">
    {{ $t('associate.detail.membershipHistory.empty') }}
  </p>
  <UTimeline
    v-else
    :items="timelineItems"
    size="sm"
  />
</template>
