// app\utils\yearSelectItems.ts
// Shared by every page with a year USelectMenu (transactions/finance/
// statistics) — each computes its own `availableYears: number[]` differently
// (from transaction dates, or a fixed founding-year..current range), but all
// three then map it to the same { label, value } option shape identically.
export function yearSelectItems(years: number[]) {
  return years.map(year => ({ label: String(year), value: year }))
}
