<!-- app\components\tournaments\single\pairing\CommanderArt.vue -->
<!-- Ported verbatim from MagicTheGathering/league (user request 2026-09-16:
     copy the vote/commander insertion logic bit-by-bit). -->
<script setup lang="ts">
defineProps<{
  cardName: string
  artUrl: string | null
  manaCost?: string
  loading?: boolean
  size?: 'sm' | 'base'
}>()

const { t } = useI18n()
</script>

<template>
  <div class="relative h-full w-full overflow-hidden bg-muted">
    <ImageWithFallback
      :src="artUrl"
      :alt="t('tournament.single.commanderModal.artAlt', { name: cardName })"
      :loading="loading"
    />

    <div v-if="artUrl" class="absolute inset-0 bg-linear-to-b from-transparent to-[#171717]">
      <div
        class="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-1"
        :class="size === 'sm' ? 'p-2' : 'p-3'"
      >
        <h4
          class="font-bold text-white truncate"
          :class="size === 'sm' ? 'text-sm' : 'text-base'"
          :title="cardName"
        >
          {{ cardName }}
        </h4>
        <MagicManaCost
          v-if="manaCost"
          :mana-cost="manaCost"
          size="sm"
        />
      </div>
    </div>
  </div>
</template>
