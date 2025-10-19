<script lang="ts" setup>
defineProps<{
  round: number
}>()
</script>

<template>
  <div>
    <h2 class="text-2xl font-semibold mb-4">
      Gestione Round {{ round }}
    </h2>
    <!-- Round management content goes here -->
    <p>Contenuto di gestione per il Round {{ round }}.</p>
  </div>
</template>
