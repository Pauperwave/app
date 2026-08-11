<!-- app\layouts\public.vue -->
<script setup lang="ts">
// Same centered/no-sidebar shell as auth.vue, but wider — for public pages
// with more content than a login card (the tesseramento form and its
// statuto/informativa pages), not the auth flow itself.
</script>

<template>
  <div class="min-h-screen flex flex-col items-center px-4 py-12">
    <UButton
      :icon="ICONS.chevronLeft"
      to="/"
      size="xl"
      color="neutral"
      variant="subtle"
      class="absolute left-8 top-8 rounded-full z-10"
    />

    <div class="max-w-2xl w-full">
      <slot />
    </div>
  </div>
</template>
