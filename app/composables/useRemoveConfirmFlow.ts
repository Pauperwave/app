// app\composables\useRemoveConfirmFlow.ts
// Confirm-before-destructive-action flow, extracted out of AcceptancePicker.vue
// once "Pre-registrati" and "Iscritti (Pagato)" each grew a byte-identical copy
// of it (user request, 2026-08-27) — same ConfirmModal-driving shape every
// other destructive action in this app uses. The actual removal (hard delete
// vs status revert) is passed in as onConfirm, not baked into this composable
// — the two sides run genuinely different mutations, and parameterizing that
// as a mode: 'delete' | 'revert' flag would just relocate the bug this file
// already fixed once (2026-08-27: hard-deleting "Iscritti (Pagato)" rows also
// silently removed them from "Pre-registrati").
export interface UseRemoveConfirmFlowOptions<T> {
  onConfirm: (items: T[]) => void
  getLabel: (item: T) => string
  titleKey: string
  descriptionKey: string
  descriptionBatchKey: string
}

export function useRemoveConfirmFlow<T>(options: UseRemoveConfirmFlowOptions<T>) {
  const { t } = useI18n()
  const pending = ref<T[]>([]) as Ref<T[]>

  const isOpen = computed({
    get: () => pending.value.length > 0,
    set: (value) => { if (!value) pending.value = [] }
  })

  function request(itemsToRemove: T[]) {
    if (itemsToRemove.length) pending.value = itemsToRemove
  }

  function confirm() {
    options.onConfirm(pending.value)
    pending.value = []
  }

  // Array destructure + `!first` guard, not `pending.value[0]!` — no
  // non-null assertions (standing convention).
  const description = computed(() => {
    const [first, ...rest] = pending.value
    if (!first) return undefined
    return rest.length === 0
      ? t(options.descriptionKey, { name: options.getLabel(first) })
      : t(options.descriptionBatchKey, { count: pending.value.length })
  })

  const title = computed(() => t(options.titleKey))

  return { isOpen, request, confirm, description, title }
}
