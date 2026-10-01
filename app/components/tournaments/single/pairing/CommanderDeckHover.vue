<!-- app\components\tournaments\single\pairing\CommanderDeckHover.vue -->
<!-- A deck's commander name(s); hovering shows the card art, fetched on first hover. -->
<script setup lang="ts">
const { commander1Name, commander2Name = null } = defineProps<{
  commander1Name: string
  commander2Name?: string | null
}>()

const isOpen = ref(false)
const hasBeenOpened = ref(false)
watch(isOpen, (open) => {
  if (open) hasBeenOpened.value = true
})

const names = computed(() =>
  [commander1Name, commander2Name].filter((name): name is string => !!name))
const { data: cards } = useCommandersByNamesQuery(names, hasBeenOpened)
</script>

<template>
  <UPopover
    v-model:open="isOpen"
    mode="hover"
    :open-delay="150"
  >
    <span class="inline-flex items-center gap-1.5 cursor-default underline decoration-dotted">
      <UIcon :name="ICONS.commander" class="size-4 text-primary shrink-0" />
      {{ names.join(' / ') }}
    </span>

    <template #content>
      <div class="flex gap-2 p-2">
        <NuxtImg
          v-for="name in names"
          :key="name"
          :src="cards?.get(name)?.largeImageUrl ?? undefined"
          :alt="name"
          class="w-56 aspect-5/7 rounded-lg shadow-xl object-cover bg-muted"
          loading="lazy"
        />
      </div>
    </template>
  </UPopover>
</template>
