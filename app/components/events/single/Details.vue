<!-- app\components\events\single\Details.vue -->
<!--
  What the event page shows beyond its tournaments (user request, 2026-10-03, modeled on Radio
  Atog 2026): tagline and edition, description, tickets, membership, practical notes and partners.
  Every part is optional and disappears when empty.
-->
<script setup lang="ts">
import { groupEventPartners } from '#shared/utils/events/eventPartners'
import type { Event } from '~/types'

const { event } = defineProps<{
  event: Event
}>()

const { t } = useI18n()

const partnerGroups = computed(() => groupEventPartners(event.partners))

const ticketsOnSaleLabel = computed(() => {
  if (!event.ticketsOnSaleOn) return null
  const date = new Date(`${event.ticketsOnSaleOn}T00:00:00`)
    .toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
  return t('event.details.ticketsOnSaleLabel', { date })
})

const hasDetails = computed(() => !!(
  event.description || event.practicalNotes || event.ticketsUrl
  || event.membershipRequired || event.partners.length
))
</script>

<template>
  <div v-if="hasDetails" class="flex flex-col gap-3">
    <p v-if="event.description" class="text-sm whitespace-pre-line">
      {{ event.description }}
    </p>

    <div v-if="event.ticketsUrl || event.membershipRequired" class="flex flex-wrap items-center gap-2">
      <UButton
        v-if="event.ticketsUrl"
        :to="event.ticketsUrl"
        :label="t('event.details.ticketsButton')"
        :trailing-icon="ICONS.externalLink"
        target="_blank"
        size="sm"
      />
      <span v-if="ticketsOnSaleLabel" class="flex items-center gap-1.5 text-sm text-muted">
        <UIcon :name="ICONS.calendar" class="size-4 shrink-0" />
        {{ ticketsOnSaleLabel }}
      </span>

      <template v-if="event.membershipRequired">
        <UBadge
          :label="t('event.details.membershipBadge')"
          :icon="ICONS.shieldCheck"
          color="warning"
          variant="subtle"
        />
        <UButton
          v-if="event.membershipUrl"
          :to="event.membershipUrl"
          :label="t('event.details.membershipButton')"
          :trailing-icon="ICONS.externalLink"
          target="_blank"
          color="neutral"
          variant="outline"
          size="sm"
        />
      </template>
    </div>

    <div v-if="event.practicalNotes" class="flex items-start gap-1.5 text-sm text-muted">
      <UIcon :name="ICONS.info" class="mt-0.5 size-4 shrink-0" />
      <span class="whitespace-pre-line">{{ event.practicalNotes }}</span>
    </div>

    <div
      v-for="group in partnerGroups"
      :key="group.role"
      class="flex flex-wrap items-center gap-x-4 gap-y-2"
    >
      <span class="text-xs font-semibold uppercase tracking-wider text-muted">
        {{ t(`event.partners.groups.${group.role}`) }}
      </span>
      <component
        :is="partner.linkUrl ? 'a' : 'span'"
        v-for="partner in group.partners"
        :key="partner.name"
        :href="partner.linkUrl ?? undefined"
        :target="partner.linkUrl ? '_blank' : undefined"
        :rel="partner.linkUrl ? 'noopener noreferrer' : undefined"
        class="flex items-center gap-1.5 text-sm font-medium"
        :class="partner.linkUrl && 'text-primary hover:underline'"
      >
        <img
          v-if="partner.logoUrl"
          :src="partner.logoUrl"
          :alt="partner.name"
          class="h-5 w-auto"
        >
        <template v-else>
          {{ partner.name }}
        </template>
      </component>
    </div>
  </div>
</template>
