<!-- app\layouts\public-wide.vue -->
<script setup lang="ts">
// Same no-auth/no-sidebar intent as public.vue, but full width — for public
// pages whose content is a wide table (standings rankings) rather than a
// centered form. No back-button-to-"/" like public.vue: "/" redirects to
// /login for a signed-out visitor, which would be a dead end here.
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <slot />
  </div>
</template>
