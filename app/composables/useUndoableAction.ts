// app\composables\useUndoableAction.ts
// Generic 10-second grace period for destructive/negative confirm actions
// (2026-08-13 user request: "every destructive or 'no' action should be
// revertable"). Closes the confirm modal immediately and shows a toast with
// an "Annulla" action instead of running the mutation right away — the
// mutation itself (`commit`) only fires once the window elapses, so
// "undo" means "never happened" rather than a real post-commit rollback.
//
// `onApply`/`onRevert` (2026-08-16 user request) are for a purely local,
// UI-only optimistic patch — e.g. hiding a row from a list the instant the
// action is requested, so it doesn't look like the change is "queued" for
// 10 seconds. This is NOT a real optimistic mutation: nothing server-side
// happens until `commit` fires, so `onRevert` only needs to undo the local
// patch `onApply` made, never a real write.
const UNDO_WINDOW_MS = 10000

export function useUndoableAction() {
  const toast = useToast()
  const { t } = useI18n()

  function run(options: {
    title: string
    description?: string
    onApply?: () => void
    onRevert?: () => void
    commit: () => void | Promise<void>
  }) {
    options.onApply?.()

    let undone = false
    const timeoutId = setTimeout(() => {
      if (!undone) options.commit()
    }, UNDO_WINDOW_MS)

    const entry = toast.add({
      title: options.title,
      description: options.description,
      color: 'neutral',
      duration: UNDO_WINDOW_MS,
      actions: [{
        label: t('common.cancel'),
        icon: ICONS.undo,
        color: 'neutral',
        variant: 'outline',
        onClick: () => {
          undone = true
          clearTimeout(timeoutId)
          options.onRevert?.()
        }
      }]
    })

    return entry
  }

  return { run }
}
