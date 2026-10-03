// app\composables\telegram\useMatchScore.ts
import type { Player } from './telegramTypes'

const GAMES_TO_WIN_MATCH = 2

// The 50-minute round covers the whole Bo3 match (up to 3 games), not a single game: winGame
// therefore doesn't touch the timer/extra turns, which are only reset explicitly by their own reset
// buttons
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
