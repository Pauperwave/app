// app\composables\useSubmitWithToast.ts
// The submitting-ref + try/toast-success-and-close/catch-toast-error/finally wrapper around each
// domain's mutateAsync, shared by 7 EditModal.vue files
// (associates/events/leagues/locations/tournaments/transactions/wanted-cards). Payload-building
// above the call stays in each EditModal, being domain-specific
interface SubmitWithToastOptions {
  successTitle: string
  successDescription?: string
  errorTitle: string
  onSuccess?: () => void
}

export function useSubmitWithToast() {
  const toast = useToast()
  const submitting = ref(false)

  async function submitWithToast(action: () => Promise<unknown>, options: SubmitWithToastOptions) {
    submitting.value = true
    try {
      await action()
      toast.add({
        title: options.successTitle,
        description: options.successDescription,
        color: 'success'
      })
      options.onSuccess?.()
    } catch (err) {
      toast.add({
        title: options.errorTitle,
        description: toErrorMessage(err),
        color: 'error'
      })
    } finally {
      submitting.value = false
    }
  }

  return { submitting, submitWithToast }
}
