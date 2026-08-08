// app\composables\useCurrentAssociate.ts
// Risolve l'Associato corrispondente all'utente loggato via email — non
// esiste un link diretto auth-user -> associato (a differenza dei
// Giocatori, che hanno players.user_id), stesso confronto usato in
// server/api/check-associate.post.ts per il login stesso. Condiviso tra
// useWantedCardsFilters.ts ("Le mie richieste") e AddModal.vue (precompilare
// "Giocatore" con l'utente loggato).
export function useCurrentAssociate() {
  const authUser = useSupabaseUser()
  const { associates } = useAssociates()

  return computed(() =>
    associates.value.find(associate => associate.email_address === authUser.value?.email) ?? null)
}
