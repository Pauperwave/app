<!-- app\components\wanted-cards\CardPreviewTooltip.vue -->

<!--
  Anteprima carta al passaggio del mouse (desktop) o al tap (mobile) — stesso
  comportamento di MagicTheGathering/blog's magic/card/Tooltip.vue: su
  desktop un tooltip segue il puntatore, su mobile il tap apre una modale a
  schermo intero invece (hover non esiste su touch). Qui l'immagine è già
  nota staticamente (dati Scryfall inseriti a mano), quindi non c'è stato di
  caricamento da gestire, e non serve il flip fronte/retro (nessuna carta
  double-faced fra le carte cercate al momento).
-->
<script setup lang="ts">
const { name, imageUrl } = defineProps<{
  name: string
  imageUrl?: string | null
}>()

const { isMobile } = useDevice()

const tooltipOpen = ref(false)
const anchor = ref({ x: 0, y: 0 })
const showModal = ref(false)

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
  if (!isMobile) {
    anchor.value = { x: ev.clientX, y: ev.clientY }
    tooltipOpen.value = true
  }
}

function handlePointerLeave() {
  if (!isMobile) tooltipOpen.value = false
}

function handlePointerMove(ev: PointerEvent) {
  if (!isMobile) anchor.value = { x: ev.clientX, y: ev.clientY }
}

function handleClick() {
  if (isMobile) showModal.value = true
}
</script>

<template>
  <UTooltip
    v-model:open="tooltipOpen"
    :disabled="isMobile"
    :arrow="false"
    :delay-duration="100"
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
      class="text-primary font-medium"
      :class="isMobile ? 'cursor-pointer underline' : 'cursor-help hover:underline'"
      :role="isMobile ? 'button' : undefined"
      :aria-label="isMobile ? `Vedi l'immagine di ${name}` : undefined"
      @pointerenter="handlePointerEnter"
      @pointerleave="handlePointerLeave"
      @pointermove="handlePointerMove"
      @click="handleClick"
    >
      <slot>{{ name }}</slot>
    </span>

    <template #content>
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="name"
        class="w-70 h-auto rounded-xl"
      >
    </template>
  </UTooltip>

  <UModal
    v-model:open="showModal"
    :title="name"
    :description="`Immagine di ${name}`"
    :ui="{
      content: 'bg-transparent shadow-none ring-0',
      overlay: 'bg-black/80'
    }"
  >
    <template #content>
      <div class="flex items-center justify-center p-4">
        <img
          v-if="imageUrl"
          :src="imageUrl"
          :alt="name"
          class="block max-w-full max-h-[75vh] rounded-xl shadow-2xl"
        >
      </div>
    </template>
  </UModal>
</template>
