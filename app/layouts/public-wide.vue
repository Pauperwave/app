<!-- app\layouts\public-wide.vue -->
<script setup lang="ts">
// Same no-auth/no-sidebar intent as public.vue, but full width — for public
// pages whose content is a wide table (standings rankings) rather than a
// centered form. No back-button-to-"/": "/" redirects to /login for a
// signed-out visitor, which would be a dead end here — auth.vue/public.vue
// both carried that same dead button until 2026-08-29 (user report), this
// file just never had it in the first place.
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <slot />
  </div>
</template>
