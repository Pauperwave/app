<!-- app\components\TourGuide.vue -->
<script setup lang="ts">
import type { UseTourReturn } from '@nuxt/ui/composables'

// hShortcut: default.vue's own <TourGuide :tour="shortcutsTour"> is mounted
// on every page alongside whichever page-specific tour that page renders
// (default.vue is the layout, not a page) — both instances registering a
// bare "h" would collide, and the shortcuts tour already has its own trigger
// (the sidebar's "Scorciatoie da tastiera" item). Opted out there via
// :h-shortcut="false"; every page tour keeps the default (true).
const { tour, hShortcut = true } = defineProps<{ tour: UseTourReturn, hShortcut?: boolean }>()

// Bare "h" starts/restarts this page's tour — same "b pattern" as
// default.vue's sidebar-collapse shortcut (docs/architecture/shortcuts.md):
// the active tour is page-local state useDashboard.ts can't reach, so
// defineShortcuts is called directly from here instead. At most one page
// tour's TourGuide is ever mounted at a time, and Nuxt UI's defineShortcuts
// tears itself down on unmount, so navigating to another page automatically
// swaps which tour "h" starts — no manual registry needed. Doesn't collide
// with the existing g-h chord (Home): defineShortcuts treats a bare "h" and
// the two-key chord "g" then "h" as distinct bindings.
if (hShortcut) {
  defineShortcuts({
    h: () => tour.start()
  })
}

// Left/Right arrow keys mirror the Indietro/Avanti buttons — same
// usingInput/modifier-key guard as default.vue's own global keydown listener,
// so this doesn't hijack cursor movement while typing in a form field (e.g.
// while a step is anchored to an input the visitor is actively using).
useEventListener('keydown', (event: KeyboardEvent) => {
  if (!tour.open.value) return

  const target = event.target as HTMLElement | null
  const usingInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
  if (usingInput || event.metaKey || event.ctrlKey || event.altKey) return

  if (event.key === 'ArrowLeft' && tour.hasPrev.value) {
    event.preventDefault()
    tour.prev()
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    if (tour.hasNext.value) tour.next()
    else tour.finish()
  }
})
</script>

<template>
  <TourSpotlight :tour="tour" />

  <!-- z-20 on content: must stay above TourSpotlight's z-10 dim overlay —
       the content slot has z-index:auto by default, which would otherwise
       paint below the overlay's explicit z-index. -->
  <UPopover
    :open="tour.open.value"
    :reference="tour.reference.value"
    :ui="{ content: 'z-20' }"
    @update:open="(value: boolean) => { if (!value) tour.finish() }"
  >
    <template #content>
      <div class="p-4 w-72 space-y-3">
        <div class="flex items-start justify-between gap-2">
          <p class="font-semibold">
            {{ tour.current.value?.title }}
          </p>
          <UButton
            :icon="ICONS.close"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="tour.finish()"
          />
        </div>
        <!-- Plain text by default; a consumer can override via #description
             when a step's copy needs rich content (e.g. real UKbd chips
             instead of quoted letters — see useShortcutsTour.ts). -->
        <slot name="description" :step="tour.current.value">
          <p class="text-sm text-muted">
            {{ tour.current.value?.description }}
          </p>
        </slot>
        <div class="flex items-center justify-between pt-1">
          <span class="text-xs text-muted">
            {{ $t('tour.stepIndicator', {
              current: tour.index.value + 1,
              total: tour.total.value
            }) }}
          </span>
          <div class="flex gap-2">
            <UButton
              :label="$t('tour.back')"
              color="neutral"
              variant="subtle"
              size="sm"
              :disabled="!tour.hasPrev.value"
              @click="tour.prev()"
            />
            <UButton
              :label="tour.hasNext.value
                ? $t('tour.next')
                : $t('tour.finish')"
              color="primary"
              size="sm"
              @click="tour.hasNext.value ? tour.next() : tour.finish()"
            />
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>
