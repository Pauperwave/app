// app\utils\finance\amountCell.ts
// Shared cell renderer for every /finance table's currency columns: 0,00 € reads dimmer than a real
// amount. `text-dimmed`, not `text-muted`: UTable's default cell color already computes to
// `text-muted`, so that would be a no-op
export function amountCell(amount: number, formatter: Intl.NumberFormat) {
  return h('span', amount ? undefined : { class: 'text-dimmed' }, formatter.format(amount))
}
