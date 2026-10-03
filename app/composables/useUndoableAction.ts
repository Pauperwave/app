// app\composables\useUndoableAction.ts
// Generic 10-second grace period for destructive/negative confirm actions: closes the confirm modal
// at once and shows a toast with an "Annulla" action instead of running the mutation, which
// (`commit`) only fires once the window elapses, so "undo" means "never happened", not a
// post-commit rollback.
//
// `onApply`/`onRevert` are for a purely local, UI-only optimistic patch (e.g. hiding a row the
// instant the action is requested). NOT a real optimistic mutation: nothing server-side happens
// until `commit`, so `onRevert` only undoes the local patch
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
