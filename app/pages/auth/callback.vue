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
  <div>Waiting for login...</div>
</template>
