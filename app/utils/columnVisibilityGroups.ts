// app\utils\columnVisibilityGroups.ts
// Shared by useColumnVisibilityItems.ts and useAssociatesTableColumns.ts's
// own getVisibilityItems — both build a "Mostra colonne" dropdown from a
// table's hideable columns, and both want the same opt-in section dividers
// (e.g. Consensi/Anagrafica/Residenza/Trail) rather than one flat list
// (user request, 2026-08-27). Kept as a plain array-transform, not baked
// into either composable, so a caller with no grouping opinion (most of
// them) pays nothing for this.
interface WithId {
  id: string
}

export function insertGroupSeparators<T extends WithId>(
  columns: T[],
  separatorBeforeIds: string[] = []
): (T | { type: 'separator' })[] {
  if (!separatorBeforeIds.length) return columns

  const result: (T | { type: 'separator' })[] = []
  for (const column of columns) {
    // No separator before the very first item, and never two in a row (a
    // boundary column that isn't actually present/hideable on this table
    // shouldn't leave a stray divider next to the previous one).
    if (separatorBeforeIds.includes(column.id) && result.length) {
      result.push({ type: 'separator' })
    }
    result.push(column)
  }
  return result
}
