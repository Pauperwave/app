<!-- app\components\TourGuide.vue -->
<script setup lang="ts">
import type { UseTourReturn } from '@nuxt/ui/composables'

const { tour } = defineProps<{ tour: UseTourReturn }>()
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
