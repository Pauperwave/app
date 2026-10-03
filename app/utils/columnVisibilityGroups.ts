// app\utils\columnVisibilityGroups.ts
// Shared by useColumnVisibilityItems.ts and useAssociatesTableColumns.ts's getVisibilityItems: both
// build a "Mostra colonne" dropdown from a table's hideable columns with opt-in section dividers
// (Consensi/Anagrafica/Residenza/Trail). A plain array-transform, not baked into either composable,
// so callers with no grouping pay nothing.
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
    // No separator before the first item or twice in a row (a boundary column that isn't hideable
    // here must not leave a stray divider)
    if (separatorBeforeIds.includes(column.id) && result.length) {
      result.push({ type: 'separator' })
    }
    result.push(column)
  }
  return result
}
