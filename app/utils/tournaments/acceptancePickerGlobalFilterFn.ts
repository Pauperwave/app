// app\utils\tournaments\acceptancePickerGlobalFilterFn.ts
import type { Row } from '@tanstack/vue-table'
import type { AcceptancePickerItem } from '~/components/tournaments/single/AcceptancePicker.vue'

// Shared UTable globalFilterFn for AcceptancePicker.vue's "Pre-registrati" and "Iscritti (Pagato)"
// tables: name and email substring match
export function acceptancePickerGlobalFilterFn(
  row: Row<AcceptancePickerItem>, _columnId: string, filterValue: string
): boolean {
  const query = filterValue.trim().toLowerCase()
  if (!query) return true

  const { label, description } = row.original
  return label.toLowerCase().includes(query) || description.toLowerCase().includes(query)
}
