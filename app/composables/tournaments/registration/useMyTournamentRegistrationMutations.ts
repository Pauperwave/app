// app\composables\tournaments\registration\useMyTournamentRegistrationMutations.ts
// Player self-registration/unregistration (RegisterButton.vue), separate from the staff-facing
// useTournamentRegistrationsMutations.ts (which needs a tournamentUuid up front and manages other
// players' rows). Every write goes through server/api/tournament-registrations/self-*.post.ts, the
// BFF convention
export function useMyTournamentRegistrationMutations() {
  const queryCache = useQueryCache()
  const toast = useToast()
  const { t } = useI18n()

  const invalidate = (tournamentUuid: string) => {
    queryCache.invalidateQueries({ key: MY_TOURNAMENT_REGISTRATIONS_KEY })
    queryCache.invalidateQueries({ key: TOURNAMENT_REGISTRATIONS_KEY(tournamentUuid) })
  }

  function toastError(error: unknown) {
    toast.add({
      title: t('event.calendar.registerErrorTitle'),
      description: toErrorMessage(error),
      color: 'error'
    })
  }

  const selfRegister = useMutation({
    mutation: (tournamentUuid: string) =>
      $fetch('/api/tournament-registrations/self-register', {
        method: 'POST',
        body: { tournamentUuid }
      }),
    onError: toastError,
    onSettled: (_data, _error, tournamentUuid) => invalidate(tournamentUuid)
  })

  const selfUnregister = useMutation({
    mutation: (tournamentUuid: string) =>
      $fetch('/api/tournament-registrations/self-unregister', {
        method: 'POST',
        body: { tournamentUuid }
      }),
    onError: toastError,
    onSettled: (_data, _error, tournamentUuid) => invalidate(tournamentUuid)
  })

  return { selfRegister, selfUnregister }
}
