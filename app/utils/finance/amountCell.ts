// app\utils\finance\amountCell.ts
// Shared cell renderer for every /finance table's currency columns — 0,00 €
// reads as text-muted rather than full-contrast (user request, 2026-08-24,
// extending the fee column's own existing convention in MethodCostTable.vue
// to every currency cell on the page).
export function amountCell(amount: number, formatter: Intl.NumberFormat) {
  return h('span', amount ? undefined : { class: 'text-muted' }, formatter.format(amount))
}
