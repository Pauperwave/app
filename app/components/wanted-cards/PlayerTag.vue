<!-- app\components\wanted-cards\PlayerTag.vue -->

<!--
  Nome giocatore con avatar, tramite UUser. L'avatar è generato
  deterministicamente con DiceBear (stesso pattern di generatePlayerAvatar()
  in MagicTheGathering/league, che però lo usa con UAvatar/PlayerNameTag —
  qui si usa UUser al suo posto).
-->
<script setup lang="ts">
const { name } = defineProps<{
  name: string
}>()

const avatar = computed(() => ({ src: generatePlayerAvatar(name), alt: name }))
</script>

<template>
  <UUser :name="name" :avatar="avatar" size="sm" />
</template>
