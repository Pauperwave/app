<!-- app\components\calendar\PartnerDiscounts.vue -->
<!--
  Sponsor/partner discount codes for /calendario (see PublicCalendarPage.vue),
  a dedicated section between the cards timeline and CalendarFooter.vue —
  static list (app/utils/calendar/partnerDiscounts.ts), same mock/static
  convention as server/api/members.ts until it's worth a real table. Renders
  nothing when the list is empty rather than showing a section with no
  content.
-->
<script lang="ts" setup>
const { t } = useI18n()
const { copyToClipboard } = useCopyToClipboard()
</script>

<template>
  <div
    v-if="PARTNER_DISCOUNTS.length"
    class="flex flex-col gap-3 max-w-2xl w-full mx-auto"
  >
    <h2 class="text-sm font-semibold text-muted">
      {{ t('event.calendar.partnerDiscounts.title') }}
    </h2>

    <UCard v-for="discount in PARTNER_DISCOUNTS" :key="discount.code">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="font-semibold truncate">
            {{ discount.partner }}
          </p>
          <p class="text-sm text-muted mt-1">
            {{ discount.description }}
          </p>
          <a
            v-if="discount.url"
            :href="discount.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-primary hover:underline w-fit mt-1 inline-block"
          >
            {{ discount.url }}
          </a>
        </div>

        <UButton
          :trailing-icon="ICONS.copy"
          :label="discount.code"
          color="neutral"
          variant="subtle"
          class="shrink-0 font-mono"
          @click="copyToClipboard(
            discount.code,
            t('event.calendar.partnerDiscounts.codeCopiedTitle')
          )"
        />
      </div>
    </UCard>
  </div>
</template>
