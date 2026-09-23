// app\composables\tournaments\rounds\useRoundLifecycleMutation.ts
// Shared mutation shape behind every round-lifecycle write (start round 1,
// advance round, turn back round, reset) for both Commander and Swiss
// tournaments — same $fetch/onError-toast/onSettled wiring, differing only
// in which server/api endpoint, error title and invalidation each one uses.
// Extracted out of useTournamentRoundsMutations.ts/
// useTournamentSwissRoundsMutations.ts/useTournamentResetMutation.ts, which
// had independently duplicated this exact wiring (fallow:dupes, 2026-09-23).
export function useRoundLifecycleMutation<TVars>(options: {
  endpoint: string
  errorTitleKey: string
  body: (vars: TVars) => object
  onSettled: () => void
}) {
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutation: (vars: TVars) =>
      $fetch(options.endpoint, { method: 'POST', body: options.body(vars) }),
    onError: (error) => {
      toast.add({
        title: t(options.errorTitleKey),
        description: toErrorMessage(error),
        color: 'error'
      })
    },
    onSettled: options.onSettled
  })
}
