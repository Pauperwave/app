// app\composables\useCopyToClipboard.ts
// Copy-to-clipboard-with-toast helper shared by useAssociatesRowActions.ts and
// usePlayersRowActions.ts. A generic error title (common.copyErrorTitle), as there is nothing
// domain-specific to say on failure
export function useCopyToClipboard() {
  const { t } = useI18n()
  const toast = useToast()

  async function copyToClipboard(text: string, successTitle: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.add({ title: successTitle, color: 'success' })
    } catch (err) {
      toast.add({
        title: t('common.copyErrorTitle'),
        description: toErrorMessage(err),
        color: 'error'
      })
    }
  }

  return { copyToClipboard }
}
