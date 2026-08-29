<!-- app\components\magic\CardHoverPreview.vue -->

<!--
  Preview of a card image that follows the pointer, wrapped around whatever
  content is passed in the slot.

  The pointer is tracked by hand with a virtual :reference instead of using
  UTooltip's built-in hover trigger: inside Reka's listbox (underneath
  USelectMenu) pointer events are intercepted before reaching the
  TooltipTrigger, which therefore never fires. Same workaround as
  CommanderSuggestionRow.vue in MagicTheGathering/league and
  magic/card/Tooltip.vue in MagicTheGathering/blog.

  `mobileModal` is for cases where the trigger is something the user would tap
  (a card name in a table): hover does not exist on touch, so the tap opens the
  image full screen instead of doing nothing.

  Attributes passed by the caller (class above all) land on the trigger, not on
  the UTooltip — see inheritAttrs: false.
-->
<script setup lang="ts">
interface Props {
  imageUrl?: string | null
  /** Alt text for the image, and the modal title on mobile. */
  alt: string
  mobileModal?: boolean
}

const { imageUrl, alt, mobileModal = false } = defineProps<Props>()

defineOptions({ inheritAttrs: false })

const { isMobile } = useDevice()
const tapToOpen = computed(() => mobileModal && isMobile)

const tooltipOpen = ref(false)
const showModal = ref(false)
const { anchor, reference } = usePointerReference()

function handlePointerEnter(ev: PointerEvent) {
  if (!imageUrl || tapToOpen.value) return
  anchor.value = { x: ev.clientX, y: ev.clientY }
  tooltipOpen.value = true
}

function handlePointerLeave() {
  tooltipOpen.value = false
}

function handlePointerMove(ev: PointerEvent) {
  if (tooltipOpen.value) anchor.value = { x: ev.clientX, y: ev.clientY }
}

function handleClick() {
  if (tapToOpen.value && imageUrl) showModal.value = true
}
</script>

<template>
  <UTooltip
    v-model:open="tooltipOpen"
    :disabled="tapToOpen"
    :arrow="false"
    :reference="reference"
    :content="{
      align: 'start',
      side: 'right',
      sideOffset: 10,
      updatePositionStrategy: 'always'
    }"
    :ui="{ content: 'bg-transparent border-0 shadow-none p-0' }"
  >
    <span
      v-bind="$attrs"
      :role="tapToOpen ? 'button' : undefined"
      :aria-label="tapToOpen ? alt : undefined"
      @pointerenter="handlePointerEnter"
      @pointerleave="handlePointerLeave"
      @pointermove="handlePointerMove"
      @click="handleClick"
    >
      <slot />
    </span>

    <template v-if="imageUrl" #content>
      <NuxtImg
        :src="imageUrl"
        :alt="alt"
        format="webp"
        width="280"
        height="392"
        class="w-70 h-auto rounded-xl shadow-2xl"
      />
    </template>
  </UTooltip>

  <UModal
    v-if="mobileModal"
    v-model:open="showModal"
    :title="alt"
    :ui="{ content: 'bg-transparent shadow-none ring-0', overlay: 'bg-black/80' }"
  >
    <template #content>
      <div class="flex items-center justify-center p-4">
        <NuxtImg
          v-if="imageUrl"
          :src="imageUrl"
          :alt="alt"
          format="webp"
          width="488"
          height="680"
          class="block max-w-full max-h-[75vh] rounded-xl shadow-2xl"
        />
      </div>
    </template>
  </UModal>
</template>
