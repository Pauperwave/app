// app\utils\tournaments\acceptancePickerGlobalFilterFn.ts
import type { Row } from '@tanstack/vue-table'
import type { AcceptancePickerItem } from '~/components/tournaments/single/AcceptancePicker.vue'

// Shared UTable globalFilterFn for both the "Pre-registrati" and "Iscritti
// (Pagato)" tables in AcceptancePicker.vue — matches name and email, same
// substring-match shape as the other domains' *GlobalFilterFn.ts files.
export function acceptancePickerGlobalFilterFn(
  row: Row<AcceptancePickerItem>, _columnId: string, filterValue: string
): boolean {
  const query = filterValue.trim().toLowerCase()
  if (!query) return true

  const { label, description } = row.original
  return label.toLowerCase().includes(query) || description.toLowerCase().includes(query)
}
