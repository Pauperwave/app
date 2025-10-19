<script setup lang="ts">
const user = useSupabaseUser()

watch(user, () => {
  console.log('User state changed:', user.value)
  if (user.value) {
    // Redirect to protected page
    return navigateTo('/')
  }
}, { immediate: true })
</script>

<template>
  <div>Waiting for login...</div>
</template>
