// app\composables\useCopyToClipboard.ts
// Extracted out of useAssociatesRowActions.ts and usePlayersRowActions.ts
// (2026-08-29, fallow:dupes) — byte-identical copy-to-clipboard-with-toast
// helper, already cross-referenced by comment in both ("Same clipboard
// pattern as ...") before being pulled out here. Generic error title
// (common.copyErrorTitle) since there's nothing domain-specific to say on
// failure — same reasoning as the original comments.
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
