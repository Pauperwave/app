// app\composables\useUndoableAction.ts
// Generic 10-second grace period for destructive/negative confirm actions
// (2026-08-13 user request: "every destructive or 'no' action should be
// revertable"). Closes the confirm modal immediately and shows a toast with
// an "Annulla" action instead of running the mutation right away — the
// mutation itself (`commit`) only fires once the window elapses, so
// "undo" means "never happened" rather than a real post-commit rollback.
const UNDO_WINDOW_MS = 10000

export function useUndoableAction() {
  const toast = useToast()
  const { t } = useI18n()

  function run(options: {
    title: string
    description?: string
    commit: () => void | Promise<void>
  }) {
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
        }
      }]
    })

    return entry
  }

  return { run }
}
