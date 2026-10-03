// app\composables\telegram\useExtraTurns.ts
import type { Player } from './telegramTypes'

const TOTAL_TURNS = 5

function otherPlayer(player: Player): Player {
  return player === 'me' ? 'opponent' : 'me'
}

export function useExtraTurns() {
  // Who plays turn 1: settable at the table before starting, then it alternates on its own every
  // turn
  const startingPlayer = ref<Player>('me')

  const turn = ref(1)
  const isLastTurn = computed(() => turn.value >= TOTAL_TURNS)
  const activePlayer = computed<Player>(() => (
    turn.value % 2 === 1 ? startingPlayer.value : otherPlayer(startingPlayer.value)
  ))

  // Which turn numbers belong to whom (e.g. 1→3→5 for the starter, 2→4 for the other), shown under
  // each "Io"/"Avversario" quadrant to make the sequence clear at a glance, not just the current
  // turn
  const turnsByPlayer = computed<Record<Player, number[]>>(() => {
    const sequences: Record<Player, number[]> = { me: [], opponent: [] }
    for (let candidate = 1; candidate <= TOTAL_TURNS; candidate++) {
      const player = candidate % 2 === 1 ? startingPlayer.value : otherPlayer(startingPlayer.value)
      sequences[player].push(candidate)
    }
    return sequences
  })

  function setStartingPlayer(player: Player) {
    startingPlayer.value = player
  }

  function next() {
    turn.value++

    if (isLastTurn.value) {
      telegramHaptic()?.notificationOccurred('warning')
    } else {
      telegramHaptic()?.impactOccurred('medium')
    }
  }

  // Stub: the final turn closes the extra turns instead of advancing past TOTAL_TURNS
  function endMatch() {
    telegramHaptic()?.notificationOccurred('success')
  }

  function action() {
    if (isLastTurn.value) {
      endMatch()
    } else {
      next()
    }
  }

  // Silent on purpose (no haptic), like useRoundTimer's reset(): the page adds its own
  function reset() {
    turn.value = 1
  }

  return {
    totalTurns: TOTAL_TURNS,
    turn,
    isLastTurn,
    activePlayer,
    turnsByPlayer,
    startingPlayer,
    setStartingPlayer,
    action,
    reset
  }
}
