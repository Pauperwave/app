<!-- app\components\magic\ManaCost.vue -->

<!--
  Component that renders Magic: The Gathering mana symbols.

  Uses mana-font (https://mana.andrewgioia.com/) to draw the iconographic mana
  symbols. Copied verbatim from MagicTheGathering/league
  (app/components/commander/ManaCost.vue).

  IMPORTANT: mana-font is imported `scoped` (see <style> below) to avoid CSS
  conflicts with Tailwind. Both use `ms-N` classes (mana-font for generic mana
  symbols, Tailwind for `margin-inline-start`), which clash if imported
  globally.

  Usage:
    <ManaCost mana-cost="{2}{W}{U}" />
    <ManaCost mana-cost="{R/G}" size="lg" />
-->
<script setup lang="ts">
const props = defineProps<{
  manaCost?: string | null
  size?: 'sm' | 'md' | 'lg'
}>()

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl'
}

// Parse mana cost into individual symbols (e.g., "{2}{W}{U}" -> ["2", "W", "U"])
const manaSymbols = computed(() => {
  const cost = props.manaCost || ''
  if (!cost) return []

  // Extract symbols between curly braces: {2}, {W}, {U}, etc.
  const matches = cost.match(/\{([^}]+)\}/g)
  if (!matches) return []

  return matches.map(match => match.slice(1, -1)) // Remove { and }
})

function getSymbolClasses(symbol: string): string[] {
  const clean = symbol.toLowerCase()
    .replace('//', '')
    .replace('/', '')
    .replace('{', '')
    .replace('}', '')

  // All mana symbols need .ms-cost for the circular colored background
  return [`ms-${clean}`, 'ms-cost']
}
</script>

<template>
  <div v-if="manaSymbols.length > 0" class="flex items-center gap-0.5">
    <span
      v-for="(symbol, index) in manaSymbols"
      :key="index"
      :class="['ms', ...getSymbolClasses(symbol), sizeClasses[size || 'md']]"
    />
  </div>
  <span v-else class="text-muted text-xs">—</span>
</template>

<style scoped>
/* Imported scoped, not globally (app/assets/css/main.css), so mana-font's
   classes (.ms, .ms-2, ...) get Vue's scoped data-v attribute and only ever
   apply within this component — mana-font's ms-N (mana symbol) classes
   collide by name with Tailwind's ms-N (margin-inline-start) utilities, and
   scoping wins that conflict via specificity instead of !important. */
@import "mana-font/css/mana.css";

.ms {
  display: inline-block;
  vertical-align: middle;
  border-radius: 500px;
  /* Belt and suspenders: mana-font's own stylesheet patches only .ms-2, and
     with the physical `margin-left` property, which doesn't override
     Tailwind's logical `margin-inline-start` — reset the logical property
     directly regardless of which symbol collides. */
  margin-inline-start: 0 !important;
}
</style>
