// app/pages/auth/callback.vue
<script setup lang="ts">
const user = useSupabaseUser()

// Wait for the module to handle the callback automatically
watch(user, () => {
  console.log('User state changed:', user.value)
  if (user.value) {
    // User is authenticated, redirect to home
    navigateTo('/', { replace: true })
  }
}, { immediate: true })
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-4xl mb-4" />
      <p>Verifica in corso...</p>
    </div>
  </div>
</template>
