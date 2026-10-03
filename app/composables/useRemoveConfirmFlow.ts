// app\composables\useRemoveConfirmFlow.ts
// Confirm-before-destructive-action flow extracted from AcceptancePicker.vue ("Pre-registrati" and
// "Iscritti (Pagato)" had identical copies), the ConfirmModal-driving shape every destructive
// action uses. The removal itself (hard delete vs status revert) is passed in as onConfirm: the two
// sides run genuinely different mutations, and a mode: 'delete' | 'revert' flag would relocate the
// bug already fixed once (hard-deleting "Iscritti (Pagato)" rows also silently removed them from
// "Pre-registrati")
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
