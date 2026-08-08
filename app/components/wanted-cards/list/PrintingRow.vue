<!-- app\components\wanted-cards\list\PrintingRow.vue -->

<!--
  Riga della tendina "Edizione" in AddModal.vue, con anteprima al passaggio
  del mouse — stesso meccanismo di CommanderSuggestionRow.vue in
  MagicTheGathering/league: il listbox di Reka (sotto USelectMenu) intercetta
  gli eventi pointer prima che raggiungano il trigger hover nativo di
  UTooltip, quindi qui si traccia manualmente il puntatore con un
  :reference virtuale invece di appoggiarsi al trigger integrato.
-->
<script setup lang="ts">
interface Props {
  label: string
  collectorNumber: string
  imageUrl?: string | null
  price?: number | null
}

const {
  label, collectorNumber, imageUrl, price = null
} = defineProps<Props>()

const tooltipOpen = ref(false)
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
  if (!imageUrl) return
  anchor.value = { x: ev.clientX, y: ev.clientY }
  tooltipOpen.value = true
}

function handlePointerLeave() {
  tooltipOpen.value = false
}

function handlePointerMove(ev: PointerEvent) {
  if (tooltipOpen.value) anchor.value = { x: ev.clientX, y: ev.clientY }
}
</script>

<template>
  <UTooltip
    v-model:open="tooltipOpen"
    :arrow="false"
    :reference="reference"
    :content="{ align: 'start', side: 'right', sideOffset: 10, updatePositionStrategy: 'always' }"
    :ui="{ content: 'bg-transparent border-0 shadow-none p-0' }"
  >
    <span
      class="flex items-center gap-1.5"
      @pointerenter="handlePointerEnter"
      @pointerleave="handlePointerLeave"
      @pointermove="handlePointerMove"
    >
      <span>{{ label }}</span>
      <span class="text-muted">#{{ collectorNumber }}</span>
      <span v-if="price !== null" class="text-muted ms-auto">{{ price.toFixed(2) }} €</span>
    </span>

    <template v-if="imageUrl" #content>
      <img
        :src="imageUrl"
        :alt="label"
        class="w-70 h-auto rounded-xl shadow-2xl"
      >
    </template>
  </UTooltip>
</template>
