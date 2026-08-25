// app\composables\tournaments\useTournamentRegistrationsMutations.ts
// Every write goes through a server/api endpoint holding the service-role
// key (same convention as useWantedCardsMutations.ts). Optimistic updates on
// the three per-row actions (status, delete, payment) — the ones staff click
// repeatedly while working a check-in desk — via queryCache.setQueryData in
// onMutate, rolled back in onError; registerAssociates stays invalidate-only
// (a deliberate, multi-select action, not a rapid-click one, so the extra
// optimistic-state complexity isn't worth it there). Every mutation reports
// failures via toast — previously fire-and-forget, so a failed write (RLS,
// network) left the UI silently out of sync with no feedback at all (user
// request, 2026-08-25).
import type { PaymentMethod } from '#shared/types/transactions'
import type { TournamentRegistration } from './useTournamentRegistrationsQuery'
import type { TournamentPayment } from './useTournamentPaymentsQuery'

export function useTournamentRegistrationsMutations(tournamentUuid: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const { t } = useI18n()

  const registrationsKey = () => TOURNAMENT_REGISTRATIONS_KEY(toValue(tournamentUuid))
  const paymentsKey = () => TOURNAMENT_PAYMENTS_KEY(toValue(tournamentUuid))
  const invalidate = () => {
    queryCache.invalidateQueries({ key: registrationsKey() })
    queryCache.invalidateQueries({ key: paymentsKey() })
  }

  function toastError(error: unknown) {
    toast.add({
      title: t('tournament.single.acceptancePicker.mutationErrorTitle'),
      description: toErrorMessage(error),
      color: 'error'
    })
  }

  const registerAssociates = useMutation({
    mutation: (payload: { associateUuids: string[], status?: 'registered' | 'checked_in' }) =>
      $fetch('/api/tournament-registrations/register', {
        method: 'POST',
        body: { tournamentUuid: toValue(tournamentUuid), ...payload }
      }),
    onError: toastError,
    onSettled: invalidate
  })

  const setRegistrationStatus = useMutation({
    mutation: (payload: { registrationUuids: string[], status: 'registered' | 'checked_in' | 'no_show' }) =>
      $fetch('/api/tournament-registrations/status', { method: 'POST', body: payload }),
    onMutate({ registrationUuids, status }) {
      const previous = queryCache.getQueryData<TournamentRegistration[]>(registrationsKey())
      queryCache.setQueryData<TournamentRegistration[]>(
        registrationsKey(),
        current => (current ?? []).map(registration => registrationUuids.includes(registration.uuid)
          ? {
            ...registration,
            status,
            checkedInAt: status === 'checked_in' ? new Date().toISOString() : null
          }
          : registration)
      )
      return { previous }
    },
    onError(error, _vars, context) {
      if (context?.previous) queryCache.setQueryData(registrationsKey(), context.previous)
      toastError(error)
    },
    onSettled: invalidate
  })

  const deleteRegistrations = useMutation({
    mutation: (registrationUuids: string[]) =>
      $fetch('/api/tournament-registrations/delete', {
        method: 'POST',
        body: { tournamentUuid: toValue(tournamentUuid), registrationUuids }
      }),
    onMutate(registrationUuids) {
      const previousRegistrations
        = queryCache.getQueryData<TournamentRegistration[]>(registrationsKey())
      const removedAssociateUuids = new Set(
        (previousRegistrations ?? [])
          .filter(registration => registrationUuids.includes(registration.uuid))
          .map(registration => registration.associateUuid)
      )
      const previousPayments = queryCache.getQueryData<TournamentPayment[]>(paymentsKey())

      queryCache.setQueryData<TournamentRegistration[]>(
        registrationsKey(),
        current =>
          (current ?? []).filter(registration => !registrationUuids.includes(registration.uuid))
      )
      queryCache.setQueryData<TournamentPayment[]>(
        paymentsKey(),
        current =>
          (current ?? []).filter(payment => !removedAssociateUuids.has(payment.associateUuid))
      )

      return { previousRegistrations, previousPayments }
    },
    onError(error, _vars, context) {
      if (context?.previousRegistrations) {
        queryCache.setQueryData(registrationsKey(), context.previousRegistrations)
      }
      if (context?.previousPayments) {
        queryCache.setQueryData(paymentsKey(), context.previousPayments)
      }
      toastError(error)
    },
    onSettled: invalidate
  })

  const setPayment = useMutation({
    mutation: (
      payload: { associateUuid: string, method: PaymentMethod | null, receivedBy?: string }
    ) =>
      $fetch('/api/tournament-registrations/payment', {
        method: 'POST',
        body: { tournamentUuid: toValue(tournamentUuid), ...payload }
      }),
    onMutate({ associateUuid, method }) {
      const previous = queryCache.getQueryData<TournamentPayment[]>(paymentsKey())
      queryCache.setQueryData<TournamentPayment[]>(paymentsKey(), (current) => {
        const withoutThisAssociate
          = (current ?? []).filter(payment => payment.associateUuid !== associateUuid)
        return method === null
          ? withoutThisAssociate
          : [...withoutThisAssociate, { associateUuid, paymentMethod: method }]
      })
      return { previous }
    },
    onError(error, _vars, context) {
      if (context?.previous) queryCache.setQueryData(paymentsKey(), context.previous)
      toastError(error)
    },
    onSettled: invalidate
  })

  return { registerAssociates, setRegistrationStatus, deleteRegistrations, setPayment }
}
