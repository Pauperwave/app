<!-- app\components\calendar\Footer.vue -->
<!--
  Sponsor, tax code, and contact for /calendario (see PublicCalendarPage.vue),
  one row: sponsor on the left, a flex-1 spacer, tax-code/phone buttons on
  the right (TaxCodeButton.vue, ContactButton.vue) — layout per the user's
  request 2026-08-14, tax code added 2026-08-30 for 5x1000 tax-return
  designation purposes.
-->
<script lang="ts" setup></script>

<template>
  <div
    class="flex flex-wrap items-center gap-4 mt-8 pt-6 border-t border-default max-w-2xl w-full mx-auto text-sm text-muted"
  >
    <a
      href="https://www.crvallagarina.it/"
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center gap-2"
    >
      <span class="hidden sm:inline text-xs">{{ $t('event.calendar.sponsoredBy') }}</span>
      <img
        src="https://www.crvallagarina.it/media/10316/cr-vallagarina-logo.png"
        alt="Cassa Rurale di Vallagarina"
        class="h-8 w-auto"
      >
    </a>

    <div class="flex-1" />

    <div class="flex items-center gap-2">
      <CalendarButtonTaxCodeButton />
      <CalendarButtonContactButton />
    </div>
  </div>
</template>
