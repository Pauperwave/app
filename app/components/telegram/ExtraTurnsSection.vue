<!-- app\components\telegram\ExtraTurnsSection.vue -->
<script setup lang="ts">
interface Props {
  turn: number
  totalTurns: number
  isLastTurn: boolean
  activePlayer: 'me' | 'opponent'
  turnsByPlayer: Record<'me' | 'opponent', number[]>
  startingPlayer: 'me' | 'opponent'
}

const {
  turn, totalTurns, isLastTurn, activePlayer, turnsByPlayer, startingPlayer
} = defineProps<Props>()

const emit = defineEmits<{
  setStartingPlayer: [player: 'me' | 'opponent']
  action: []
  reset: []
}>()
</script>

<template>
  <section class="flex-2 min-h-0 flex flex-col w-full gap-2">
    <p class="text-muted text-xs">
      Turni aggiuntivi a fine tempo
    </p>

    <div class="flex gap-2 justify-center w-full">
      <UButton
        size="xl"
        block
        class="h-14 text-lg"
        :variant="startingPlayer === 'me' ? 'solid' : 'subtle'"
        @click="emit('setStartingPlayer', 'me')"
      >
        Inizio io
      </UButton>

      <UButton
        size="xl"
        block
        color="neutral"
        class="h-14 text-lg"
        :variant="startingPlayer === 'opponent' ? 'solid' : 'subtle'"
        @click="emit('setStartingPlayer', 'opponent')"
      >
        Inizia avversario
      </UButton>
    </div>

    <div class="flex-1 min-h-0 grid grid-rows-2 gap-2">
      <button
        type="button"
        class="flex flex-col items-center justify-center gap-1 rounded-lg transition-colors active:opacity-80"
        :class="activePlayer === 'opponent' ? 'bg-primary text-inverted' : 'bg-elevated text-muted'"
        @click="emit('action')"
      >
        <span class="text-6xl font-bold">Avversario</span>
        <span class="flex gap-2 text-5xl tabular-nums">
          <template
            v-for="(t, i) in turnsByPlayer.opponent"
            :key="t"
          >
            <span :class="t === turn ? 'font-extrabold' : 'opacity-60'">{{ t }}</span>
            <span v-if="i < turnsByPlayer.opponent.length - 1">→</span>
          </template>
        </span>
      </button>

      <button
        type="button"
        class="flex flex-col items-center justify-center gap-1 rounded-lg transition-colors active:opacity-80"
        :class="activePlayer === 'me' ? 'bg-primary text-inverted' : 'bg-elevated text-muted'"
        @click="emit('action')"
      >
        <span class="text-6xl font-bold">Io</span>
        <span class="flex gap-2 text-5xl tabular-nums">
          <template
            v-for="(t, i) in turnsByPlayer.me"
            :key="t"
          >
            <span :class="t === turn ? 'font-extrabold' : 'opacity-60'">{{ t }}</span>
            <span v-if="i < turnsByPlayer.me.length - 1">→</span>
          </template>
        </span>
      </button>
    </div>

    <div class="flex gap-2 w-full items-stretch">
      <div class="flex items-center justify-center rounded-lg bg-elevated px-4 text-5xl font-bold tabular-nums shrink-0">
        {{ turn }}/{{ totalTurns }}
      </div>

      <UButton
        size="xl"
        block
        class="h-16 text-lg"
        @click="emit('action')"
      >
        {{ isLastTurn ? 'Fine partita' : 'Turno successivo' }}
      </UButton>

      <UButton
        size="xl"
        color="neutral"
        variant="subtle"
        class="h-16"
        :icon="ICONS.rotateBack"
        @click="emit('reset')"
      />
    </div>
  </section>
</template>
