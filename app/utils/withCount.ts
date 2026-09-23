// app\utils\withCount.ts
// Project-wide convention (2026-09-23 user request): a button or menu item
// whose action targets a multi-item selection must show how many items it
// applies to in the label itself — not just an adjacent "N selezionati" text,
// which a right-click/dropdown menu item has no room for at all. Used by
// every domain's BulkActionsBar.vue for its direct-action buttons (delete,
// approve, renew, ...) and bulk dropdown triggers (markAs, changeType, ...).
// Not applied to a dropdown's own leaf value-selection items (e.g. "Attivo"
// inside "Segna come (N)") — the trigger already carries the count, and the
// confirm step that follows shows it again.
export function withCount(label: string, count: number): string {
  return `${label} (${count})`
}
