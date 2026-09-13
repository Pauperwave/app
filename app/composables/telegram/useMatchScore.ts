// app\composables\telegram\useMatchScore.ts
import type { Player } from './telegramTypes'

const GAMES_TO_WIN_MATCH = 2

// Il round di 50 minuti copre l'intero match Bo3 (fino a 3 partite), non
// una singola partita — winGame quindi non tocca timer/turni aggiuntivi,
// vanno resettati solo esplicitamente dai loro stessi bottoni di reset.
export function useMatchScore() {
  const myGamesWon = ref(0)
  const opponentGamesWon = ref(0)
  const matchWinner = computed<Player | null>(() => {
    if (myGamesWon.value >= GAMES_TO_WIN_MATCH) return 'me'
    if (opponentGamesWon.value >= GAMES_TO_WIN_MATCH) return 'opponent'
    return null
  })

  function winGame(winner: Player) {
    if (matchWinner.value) return

    if (winner === 'me') {
      myGamesWon.value++
    } else {
      opponentGamesWon.value++
    }
    telegramHaptic()?.impactOccurred(matchWinner.value ? 'heavy' : 'medium')
  }

  function reset() {
    myGamesWon.value = 0
    opponentGamesWon.value = 0
    telegramHaptic()?.impactOccurred('light')
  }

  return {
    gamesToWinMatch: GAMES_TO_WIN_MATCH,
    myGamesWon,
    opponentGamesWon,
    matchWinner,
    winGame,
    reset
  }
}
