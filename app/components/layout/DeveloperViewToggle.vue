<!-- app\components\layout\DeveloperViewToggle.vue -->
<!-- Toggles the app-wide "developer view" (margin-visualization overlay, see
     useDeveloperView.ts/main.css's .debug-spacing), ported from league's
     DeveloperViewToggle.vue and gated behind the same hardcoded password as a speed bump, not a
     real auth boundary (the app already sits behind Supabase auth): just enough that an
     organizer's screen isn't one accidental click from a distracting debug overlay.  One
     button, one popover, content by state: pressing it again while unlocked reopens the popover
     with its settings instead of disabling developer view (password prompt while locked,
     overlay switch + disable button once unlocked). league spreads this across three components
     (DeveloperViewToggle/DeveloperOverlayToggle/DeveloperToolbarButton) since its overlay
     toggle is its own header button; collapsed into one popover here since there's no room for
     a second standalone button. -->
<script setup lang="ts">
// Hardcoded on purpose (see the file-level comment); the same value as league's
// DEVELOPER_VIEW_PASSWORD
const DEVELOPER_VIEW_PASSWORD = 'test'

const { isDeveloperView, isOverlayEnabled } = useDeveloperView()
const { t } = useI18n()

const showPopover = ref(false)
const password = ref('')
const passwordError = ref(false)

function openPopover() {
  if (!isDeveloperView.value) {
    password.value = ''
    passwordError.value = false
  }
  showPopover.value = true
}

function confirmPassword() {
  if (password.value !== DEVELOPER_VIEW_PASSWORD) {
    passwordError.value = true
    return
  }
  // Stays open on unlock: the popover's #content swaps from the password prompt to the settings
  // panel in place, so the organizer can flip "Mostra margini" without reopening it
  isDeveloperView.value = true
}

function disable() {
  isDeveloperView.value = false
  showPopover.value = false
}

const tooltipText = computed(() => isDeveloperView.value
  ? t('common.developerViewSettings')
  : t('common.enableDeveloperView'))
</script>

<template>
  <ClientOnly>
    <UPopover v-model:open="showPopover">
      <UTooltip :content="{ side: 'right' }" :text="tooltipText">
        <UButton
          :icon="ICONS.terminal"
          :color="isDeveloperView ? 'warning' : 'neutral'"
          :variant="isDeveloperView ? 'soft' : 'ghost'"
          :class="!isDeveloperView && 'text-muted'"
          :aria-label="tooltipText"
          @click="openPopover"
        />
      </UTooltip>

      <template #content>
        <div v-if="!isDeveloperView" class="p-3 flex flex-col gap-2 w-56">
          <p class="text-sm font-medium">
            {{ t('common.developerViewPasswordDescription') }}
          </p>
          <UInput
            v-model="password"
            type="password"
            :placeholder="t('common.developerViewPasswordPlaceholder')"
            autofocus
            @keyup.enter="confirmPassword"
          />
          <p v-if="passwordError" class="text-error text-xs">
            {{ t('common.developerViewPasswordError') }}
          </p>
          <UButton block @click="confirmPassword">
            {{ t('common.developerViewPasswordConfirm') }}
          </UButton>
        </div>

        <div v-else class="p-3 flex flex-col gap-3 w-56">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm">{{ t('common.developerViewOverlayLabel') }}</span>
            <USwitch v-model="isOverlayEnabled" class="cursor-pointer" />
          </div>
          <UButton
            block
            color="error"
            variant="soft"
            @click="disable"
          >
            {{ t('common.disableDeveloperView') }}
          </UButton>
        </div>
      </template>
    </UPopover>

    <template #fallback>
      <div class="size-8" />
    </template>
  </ClientOnly>
</template>
