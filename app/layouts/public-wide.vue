<!-- app\layouts\public-wide.vue -->
<script setup lang="ts">
// Same no-auth/no-sidebar intent as public.vue, but full width, for public pages whose content is a
// wide table (standings). No back-to-"/" button: "/" redirects to /login for a signed-out visitor,
// a dead end.
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <slot />
  </div>
</template>
