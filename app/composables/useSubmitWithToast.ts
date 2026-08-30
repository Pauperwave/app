// app\composables\useSubmitWithToast.ts
// Extracted out of 7 EditModal.vue files (associates/events/leagues/locations/
// tournaments/transactions/wanted-cards, 2026-08-31) — byte-identical
// submitting-ref + try/toast-success-and-close/catch-toast-error/finally
// wrapper around each domain's own mutateAsync call, same clipboard-helper
// precedent as useCopyToClipboard.ts. Payload-building above the call stays
// in each EditModal, genuinely domain-specific.
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
