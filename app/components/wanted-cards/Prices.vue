<!-- app\components\wanted-cards\Prices.vue -->
<script setup lang="ts">
interface Props {
  cardmarketPrice: number | null
  cardtraderPrice: number | null
}

const { cardmarketPrice, cardtraderPrice } = defineProps<Props>()
const { t } = useI18n()

// Highlight the cheaper source only when both prices are present: with a single
// source (or two identical ones) there is no comparison to show.
const cheapest = computed(() => {
  if (cardmarketPrice === null || cardtraderPrice === null) return null
  if (cardmarketPrice === cardtraderPrice) return null
  return cardmarketPrice < cardtraderPrice ? 'cardmarket' : 'cardtrader'
})

const sources = computed(() => [
  {
    key: 'cardmarket',
    label: t('wantedCard.grid.cardmarketShort'),
    hint: t('wantedCard.grid.cardmarketPriceHint'),
    price: cardmarketPrice
  },
  {
    key: 'cardtrader',
    label: t('wantedCard.grid.cardtraderShort'),
    hint: t('wantedCard.grid.cardtraderPriceHint'),
    price: cardtraderPrice
  }
])
</script>

<template>
  <div class="flex items-center gap-2 shrink-0">
    <UTooltip
      v-for="source in sources"
      :key="source.key"
      :text="source.hint"
    >
      <span
        class="flex items-center gap-1 text-sm"
        :class="cheapest === source.key ? 'text-success font-medium' : 'text-muted'"
      >
        <span class="text-[10px] font-medium uppercase opacity-70">{{ source.label }}</span>
        <span v-if="source.price !== null" class="tabular-nums">{{ source.price.toFixed(2) }} €</span>
        <span v-else>—</span>
      </span>
    </UTooltip>
  </div>
</template>
