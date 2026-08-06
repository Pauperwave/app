<!-- app\components\tournaments\single\RoundManager.vue -->
<script lang="ts" setup>
defineProps<{
  round: number
}>()
</script>

<template>
  <div>
    <h2 class="text-2xl font-semibold mb-4">
      {{ $t('tournament.single.roundManager.title', { round }) }}
    </h2>
    <!-- Round management content goes here -->
    <p>{{ $t('tournament.single.roundManager.content', { round }) }}</p>
  </div>
</template>
