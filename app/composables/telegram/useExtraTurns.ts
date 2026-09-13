// app\composables\telegram\useExtraTurns.ts
import type { Player } from './telegramTypes'

const TOTAL_TURNS = 5

function otherPlayer(player: Player): Player {
  return player === 'me' ? 'opponent' : 'me'
}

export function useExtraTurns() {
  // Chi gioca il turno 1 — impostabile dal tavolo prima di iniziare, poi si
  // alterna da sé ad ogni turno successivo.
  const startingPlayer = ref<Player>('me')

  const turn = ref(1)
  const isLastTurn = computed(() => turn.value >= TOTAL_TURNS)
  const activePlayer = computed<Player>(() => (
    turn.value % 2 === 1 ? startingPlayer.value : otherPlayer(startingPlayer.value)
  ))

  // Quali numeri di turno toccano a chi (es. 1→3→5 a chi inizia, 2→4
  // all'altro) — mostrato sotto ogni quadrante "Io"/"Avversario" per
  // chiarire a colpo d'occhio la sequenza, non solo il turno corrente.
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

  // Stub: il turno finale chiude i turni aggiuntivi invece di avanzare oltre
  // TOTAL_TURNS — in futuro aprirà l'invio del punteggio del match (vedi
  // /risultato, oggi anch'esso un mockup in attesa di un flusso di pairing
  // live per Pauper/Premodern).
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

  // Silenzioso di proposito (nessun haptic) — stesso motivo di
  // useRoundTimer's reset(): riusato da useMatchScore per il reset
  // automatico a inizio partita.
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
