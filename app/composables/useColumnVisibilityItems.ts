// app\composables\useColumnVisibilityItems.ts
// Shared "Mostra colonne" dropdown-item builder, used by players/index.vue
// and wanted-cards/index.vue (fallow:dupes flagged this computed as an
// identical clone) — rebuilt every time the menu opens (via `:items`), the
// official Nuxt UI pattern (UTable docs, "Column visibility" section):
// getAllColumns() + getCanHide() + toggleVisibility(), not a direct v-model
// on the individual items.
interface VisibilityColumn {
  id: string
  getCanHide: () => boolean
  getIsVisible: () => boolean
}

// Exported: this is the actual full shape the `table` template ref needs
// everywhere it's typed just for this composable — players/index.vue,
// transactions/index.vue and wanted-cards/index.vue all hand-rolled their
// own byte-identical (or near-identical, with unused extra members) copy of
// this interface before being pointed at this one (fallow:dupes, 2026-08-29).
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
