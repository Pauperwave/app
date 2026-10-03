// app\utils\yearSelectItems.ts
// Shared by every page with a year USelectMenu (transactions/finance/statistics): each computes its
// own `availableYears: number[]` differently, then maps it to the same { label, value } shape
export function yearSelectItems(years: number[]) {
  return years.map(year => ({ label: String(year), value: year }))
}
