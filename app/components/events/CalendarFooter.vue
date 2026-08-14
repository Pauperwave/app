<!-- app\components\events\CalendarFooter.vue -->
<!--
  Sponsor, site link, and contact for /calendario (see PublicCalendarPage.vue),
  one row: sponsor on the left, a flex-1 spacer, site/phone buttons on the
  right (CalendarContactButton.vue) — layout per
  the user's request 2026-08-14.
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
      <EventsCalendarContactButton />
    </div>
  </div>
</template>
