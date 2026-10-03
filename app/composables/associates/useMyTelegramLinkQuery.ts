// app\composables\associates\useMyTelegramLinkQuery.ts
import type { MyTelegramLink } from '~~/server/api/telegram/my-link.get'

// The logged-in user's own Telegram link state, for the /telegram-bot page. Refetched when the
// window regains focus (the usual Pinia Colada behavior), which is how the page notices a link
// made in Telegram while it was in the background.
export function useMyTelegramLinkQuery() {
  return useQuery({
    key: ['telegram-my-link'],
    query: () => $fetch<MyTelegramLink>('/api/telegram/my-link')
  })
}
