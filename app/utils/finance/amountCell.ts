// app\utils\finance\amountCell.ts
// Shared cell renderer for every /finance table's currency columns — 0,00 €
// reads dimmer than a real amount (user request, 2026-08-24, extending the
// fee column's own existing convention in MethodCostTable.vue to every
// currency cell on the page). `text-dimmed`, not `text-muted` — UTable's own
// default cell text color already computes to `text-muted`
// (oklch(0.705 0.015 286.067), confirmed live via devtools), so `text-muted`
// here was a no-op: 0,00 € and a real amount rendered in the exact same
// color. `text-dimmed` is one tier below that baseline.
export function amountCell(amount: number, formatter: Intl.NumberFormat) {
  return h('span', amount ? undefined : { class: 'text-dimmed' }, formatter.format(amount))
}
