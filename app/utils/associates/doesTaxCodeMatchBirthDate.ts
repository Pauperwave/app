// app\utils\associates\doesTaxCodeMatchBirthDate.ts
// Cross-checks the tax_code's encoded birth date (positions 7-11) against the form's born_date:
// catches a code that is checksum-valid but belongs to another date (transposed digits, someone
// else's code), which isValidTaxCodeChecksum.ts can't
const MONTH_CODES: Record<string, number> = {
  A: 0, B: 1, C: 2, D: 3, E: 4, H: 5, L: 6, M: 7, P: 8, R: 9, S: 10, T: 11
}

export function doesTaxCodeMatchBirthDate(taxCode: string, bornDate: Date): boolean {
  const code = taxCode.trim().toUpperCase()
  if (!/^[A-Z0-9]{16}$/.test(code)) return false

  const month = MONTH_CODES[code[8]!]
  if (month === undefined) return false

  const rawYear = Number(code.slice(6, 8))
  // Day is +40 for a female-encoded birth; no gender field to cross-check, so either parity matches
  const rawDay = Number(code.slice(9, 11))
  // Omocodia (see isValidTaxCodeChecksum.ts) can replace these digits with letters: Number() then
  // gives NaN, so don't fail a code we can't decode
  if (Number.isNaN(rawYear) || Number.isNaN(rawDay)) return true

  const day = rawDay > 40 ? rawDay - 40 : rawDay

  return rawYear === bornDate.getFullYear() % 100
    && month === bornDate.getMonth()
    && day === bornDate.getDate()
}
