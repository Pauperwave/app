<!-- app\pages\auth\callback.vue -->
// app/pages/auth/callback.vue
<script setup lang="ts">
// `useSupabaseSession` reflects the auth state synchronously from
// `onAuthStateChange` and doesn't depend on the module's `getClaims()` call,
// which can silently reject (no .catch()) and leave `useSupabaseUser()` stuck
// at null even after a successful login.
const session = useSupabaseSession()

const failed = ref(false)

if (session.value) {
  navigateTo('/', { replace: true })
} else {
  const stopWatching = watch(session, () => {
    if (session.value) {
      stopWatching()
      navigateTo('/', { replace: true })
    }
  })
}

// If the callback hasn't produced a session after a few seconds, the magic
// link is likely invalid/expired: stop showing an infinite spinner.
const timeoutId = setTimeout(() => {
  if (!session.value) {
    failed.value = true
  }
}, 3000)

onUnmounted(() => clearTimeout(timeoutId))
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <template v-if="failed">
        <p class="mb-4">
          {{ $t('login.callback.invalidLink') }}
        </p>
        <UButton to="/login">
          {{ $t('login.callback.backToLogin') }}
        </UButton>
      </template>
      <template v-else>
        <UIcon name="i-lucide-loader-2" class="animate-spin text-4xl mb-4" />
        <p>{{ $t('login.callback.verifying') }}</p>
      </template>
    </div>
  </div>
</template>
