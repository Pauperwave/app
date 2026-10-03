<!-- app\components\layout\ColorModeSwitch.vue -->
<!-- ColorModeSwitch.vue  Toggles between light and dark theme, using the useThemeTransition
     composable for the animated theme change. -->
<script setup lang="ts">
import { ICONS } from '~/utils/icons'

const { isDark, toggleTheme } = useThemeTransition()
const { t } = useI18n()
</script>

<template>
  <!-- ClientOnly to avoid server-side rendering of this UI component -->
  <ClientOnly>
    <!-- Icon-only button, no label at any sidebar state: a tooltip is the only way to tell it
         apart from the search button next to it when collapsed, like every other
         collapsed-sidebar control -->
    <UTooltip
      :text="isDark ? t('common.switchToLightMode') : t('common.switchToDarkMode')"
      :content="{ side: 'right' }"
    >
      <UButton
        :icon="isDark ? ICONS.lightMode : ICONS.darkMode"
        color="neutral"
        variant="ghost"
        class="text-muted"
        :aria-label="isDark ? t('common.switchToLightMode') : t('common.switchToDarkMode')"
        @click="toggleTheme"
      />
    </UTooltip>
    <!-- Placeholder while loading server-side -->
    <template #fallback>
      <div class="size-8" />
    </template>
  </ClientOnly>
</template>
