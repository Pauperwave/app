<!-- app\components\tournaments\StageLabel.vue -->
<!--
  Muted, superscript "Nª tappa" suffix shown next to a tournament's name
  wherever it's rendered as styled markup (grid card, table cell, calendar
  card/hero, home lists) — see Tournament.stageNumber's own comment
  (app/types/index.d.ts) and tournamentStageText() (tournamentStageLabel.ts)
  for the plain-text equivalent used where styled markup isn't possible
  (select option labels, breadcrumbs).
-->
<script setup lang="ts">
const { number } = defineProps<{ number: number }>()
</script>

<template>
  <span class="text-muted text-sm font-normal whitespace-nowrap">
    {{ number }}<sup>a</sup> tappa
  </span>
</template>
