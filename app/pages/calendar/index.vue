<!-- app\pages\calendar\index.vue -->
<script lang="ts" setup>
const { t } = useI18n()

useSeoMeta({ title: () => t('nav.calendar') })

// Same convention as FormatPage.vue / associates/requests.vue's
// tesseramentoLink: point at this deploy's own /calendario for now, until
// the subdomain is wired up in DNS (settings/domains.vue).
const publicUrl = computed(() => `${useRequestURL().origin}/calendario`)

const tour = useCalendarPageTour()
</script>

<template>
  <PageInDevelopment panel-id="calendar" :title="$t('nav.calendar')">
    <template #actions>
      <UButton
        :label="$t('event.calendarTour.startButton')"
        icon="i-lucide-circle-help"
        color="neutral"
        variant="ghost"
        @click="tour.start()"
      />

      <USeparator orientation="vertical" class="h-4" />

      <div id="tour-calendar-public-link" class="flex items-center gap-2">
        <CopyLinkButton :url="publicUrl" :label="$t('event.copyPublicLink')" />
        <UTooltip :text="$t('event.openPublicLink')">
          <UButton
            :to="publicUrl"
            target="_blank"
            :icon="ICONS.externalLink"
            :aria-label="$t('event.openPublicLink')"
            color="neutral"
            variant="outline"
            square
          />
        </UTooltip>
      </div>

      <USeparator orientation="vertical" class="h-4" />
    </template>

    <template #body>
      <PublicCalendarPage />
    </template>
  </PageInDevelopment>

  <!-- #description overrides TourGuide's default plain-text paragraph, same
       convention as default.vue's shortcuts tour — the "publicLink" step's
       {link} placeholder needs to render as a real clickable anchor, not the
       literal domain name as plain text. -->
  <TourGuide :tour="tour">
    <template #description="{ step }">
      <i18n-t
        v-if="step"
        :keypath="step.description"
        tag="p"
        scope="global"
        class="text-sm text-muted"
      >
        <template #link>
          <a
            :href="publicUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary hover:underline"
          >calendario.pauperwave.org</a>
        </template>
      </i18n-t>
    </template>
  </TourGuide>
</template>
