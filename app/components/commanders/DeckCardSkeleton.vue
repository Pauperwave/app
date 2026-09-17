<!-- app\components\commanders\DeckCardSkeleton.vue -->
<!-- Loading placeholder mirroring DeckCard.vue's layout, so the /statistics/decks
     grid doesn't reflow once real cards load — ported from league's
     CommanderDeckCardSkeleton.vue (user request, 2026-09-17). -->
<template>
  <UCard class="overflow-hidden" :ui="{ body: 'p-0 sm:p-0', footer: 'px-3 py-2' }">
    <template #header>
      <div class="flex items-center justify-end gap-2">
        <USkeleton class="h-5 w-10" />
        <USkeleton class="h-5 w-10" />
      </div>
    </template>

    <USkeleton class="aspect-4/3 w-full" />

    <template #footer>
      <USkeleton class="h-7 w-full" />
    </template>
  </UCard>
</template>
