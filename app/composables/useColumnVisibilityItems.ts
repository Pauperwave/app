// app\composables\useColumnVisibilityItems.ts
// Shared "Mostra colonne" dropdown-item builder (players/index.vue, wanted-cards/index.vue),
// rebuilt each time the menu opens (via `:items`), the official Nuxt UI pattern (UTable docs,
// "Column visibility"): getAllColumns() + getCanHide() + toggleVisibility(), not a v-model on the
// items
interface VisibilityColumn {
  id: string
  getCanHide: () => boolean
  getIsVisible: () => boolean
}

// Exported: the full shape the `table` template ref needs wherever it is typed for this composable
// (players, transactions and wanted-cards index.vue)
export interface VisibilityTableRef {
  tableApi?: {
    getAllColumns: () => VisibilityColumn[]
    getColumn: (id: string) => { toggleVisibility: (value: boolean) => void } | undefined
  } | null
}

export function useColumnVisibilityItems(
  table: Ref<VisibilityTableRef | null>,
  columnVisibility: Ref<Record<string, boolean>>,
  columnHeaders: Record<string, string>,
  // Column ids to drop a `{ type: 'separator' }` in front of — opt-in,
  // see columnVisibilityGroups.ts.
  separatorBeforeIds?: string[]
) {
  return computed(() => {
    void columnVisibility.value
    const columns = (table.value?.tableApi?.getAllColumns() ?? [])
      .filter(column => column.getCanHide())

    return insertGroupSeparators(columns, separatorBeforeIds).map((entry) => {
      if ('type' in entry) return entry
      const column = entry
      return {
        label: columnHeaders[column.id] ?? column.id,
        type: 'checkbox' as const,
        checked: column.getIsVisible(),
        onUpdateChecked(checked: boolean) {
          table.value?.tableApi?.getColumn(column.id)?.toggleVisibility(checked)
        },
        onSelect(e: Event) {
          e.preventDefault()
        }
      }
    })
  })
}
