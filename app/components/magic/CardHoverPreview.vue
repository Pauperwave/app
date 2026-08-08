<!-- app\components\magic\CardHoverPreview.vue -->

<!--
  Anteprima dell'immagine di una carta che segue il puntatore, attorno a un
  contenuto qualsiasi passato nello slot.

  Il puntatore si traccia a mano con un :reference virtuale invece di usare il
  trigger hover integrato di UTooltip: dentro il listbox di Reka (sotto
  USelectMenu) gli eventi pointer vengono intercettati prima di arrivare al
  TooltipTrigger, che quindi non scatta mai. Stesso workaround di
  CommanderSuggestionRow.vue in MagicTheGathering/league e di
  magic/card/Tooltip.vue in MagicTheGathering/blog.

  `mobileModal` per i casi in cui il trigger è un elemento su cui l'utente
  farebbe tap (un nome carta in tabella): su touch l'hover non esiste, quindi
  il tap apre l'immagine a schermo intero invece di non fare nulla.

  Gli attributi passati dal chiamante (class in primis) finiscono sul trigger,
  non sulla UTooltip — vedi inheritAttrs: false.
-->
<script setup lang="ts">
interface Props {
  imageUrl?: string | null
  /** Testo alternativo dell'immagine, e titolo della modale su mobile. */
  alt: string
  mobileModal?: boolean
}

const { imageUrl, alt, mobileModal = false } = defineProps<Props>()

defineOptions({ inheritAttrs: false })

const { isMobile } = useDevice()
const tapToOpen = computed(() => mobileModal && isMobile)

const tooltipOpen = ref(false)
const showModal = ref(false)
const anchor = ref({ x: 0, y: 0 })

const reference = computed(() => ({
  getBoundingClientRect: () => ({
    width: 0,
    height: 0,
    left: anchor.value.x,
    right: anchor.value.x,
    top: anchor.value.y,
    bottom: anchor.value.y,
    ...anchor.value
  } as DOMRect)
}))

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
      <img
        :src="imageUrl"
        :alt="alt"
        class="w-70 h-auto rounded-xl shadow-2xl"
      >
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
        <img
          v-if="imageUrl"
          :src="imageUrl"
          :alt="alt"
          class="block max-w-full max-h-[75vh] rounded-xl shadow-2xl"
        >
      </div>
    </template>
  </UModal>
</template>
