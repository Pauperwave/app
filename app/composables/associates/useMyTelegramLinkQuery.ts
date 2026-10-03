// app\composables\associates\useMyTelegramLinkQuery.ts
import type { MyTelegramLink } from '~~/server/api/telegram/my-link.get'

// The logged-in user's own Telegram link state, for the /telegram-bot page. Refetched when the
// window regains focus (the usual Pinia Colada behavior), which is how the page notices a link
// made in Telegram while it was in the background. useRequestFetch(), not the global $fetch, so a
// direct/SSR load of the page forwards the session cookies (as useMembersQuery.ts does).
export function useMyTelegramLinkQuery() {
  const requestFetch = useRequestFetch()

  return useQuery({
    key: ['telegram-my-link'],
    query: () => requestFetch<MyTelegramLink>('/api/telegram/my-link')
  })
}
