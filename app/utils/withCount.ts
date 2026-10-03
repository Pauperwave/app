// app\utils\withCount.ts
// Project-wide convention: a button or menu item acting on a multi-item selection shows how many
// items in its label (an adjacent "N selezionati" text doesn't fit a dropdown/context menu item).
// Used by every domain's BulkActionsBar.vue for direct-action buttons and bulk dropdown triggers
// (markAs, changeType, ...). Not applied to a dropdown's leaf value-selection items (e.g. "Attivo"
// inside "Segna come (N)"): the trigger already carries the count, and the confirm step shows it
// again.
export function withCount(label: string, count: number): string {
  return `${label} (${count})`
}
