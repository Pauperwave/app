<!-- app\layouts\auth.vue -->
<template>
  <div class="h-screen flex flex-col items-center justify-center gap-4 px-4">
    <UPageCard
      variant="subtle"
      class="max-w-sm w-full"
    >
      <slot />
    </UPageCard>

    <LayoutVersionBadge />
  </div>
</template>
