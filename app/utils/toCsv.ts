// app\utils\toCsv.ts
// Rows of values to CSV text: a field with a comma, a quote or a line break is quoted, and quotes
// inside it are doubled.
function escapeCsvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map(row => row.map(value => escapeCsvField(String(value))).join(','))
    .join('\n')
}
