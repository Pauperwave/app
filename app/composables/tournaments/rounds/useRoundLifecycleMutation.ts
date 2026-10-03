// app\composables\tournaments\rounds\useRoundLifecycleMutation.ts
import type { AssociateNotifyResult } from '#shared/types/notifications'

// Shared mutation shape behind every round-lifecycle write (start round 1, advance, turn back,
// reset) for Commander and Swiss: the same $fetch/onError-toast/onSettled wiring, differing only in
// endpoint, error title and invalidation. Endpoints that announce tables also return a
// `notification` (who the Telegram message reached), shown as a toast on success
export function useRoundLifecycleMutation<TVars>(options: {
  endpoint: string
  errorTitleKey: string
  body: (vars: TVars) => object
  onSettled: () => void
}) {
  const toast = useToast()
  const { t } = useI18n()

  function toastNotification({ sent, notLinked, failed }: AssociateNotifyResult) {
    const details = [t('tournament.single.playerNotification.sent', sent)]
    if (notLinked > 0) details.push(t('tournament.single.playerNotification.notLinked', notLinked))
    if (failed > 0) details.push(t('tournament.single.playerNotification.failed', failed))

    toast.add({
      title: t(failed > 0
        ? 'tournament.single.playerNotification.failedTitle'
        : 'tournament.single.playerNotification.sentTitle'),
      description: details.join(', '),
      color: failed > 0 ? 'warning' : 'success'
    })
  }

  return useMutation({
    mutation: (vars: TVars) =>
      $fetch<{ notification?: AssociateNotifyResult | null }>(options.endpoint, {
        method: 'POST',
        body: options.body(vars)
      }),
    onSuccess: (data) => {
      if (data.notification) toastNotification(data.notification)
    },
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
