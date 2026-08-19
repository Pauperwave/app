// app\utils\associates\doesTaxCodeMatchBirthDate.ts
// Cross-checks the tax_code's encoded birth date (positions 7-11: 2-digit
// year, month letter, 2-digit day) against the born_date already entered in
// the same form — catches a code that's checksum-valid but belongs to a
// different date (transposed digits, wrong person's code pasted in, etc.),
// which isValidTaxCodeChecksum.ts alone can't detect.
const MONTH_CODES: Record<string, number> = {
  A: 0, B: 1, C: 2, D: 3, E: 4, H: 5, L: 6, M: 7, P: 8, R: 9, S: 10, T: 11
}

export function doesTaxCodeMatchBirthDate(taxCode: string, bornDate: Date): boolean {
  const code = taxCode.trim().toUpperCase()
  if (!/^[A-Z0-9]{16}$/.test(code)) return false

  const month = MONTH_CODES[code[8]!]
  if (month === undefined) return false

  const rawYear = Number(code.slice(6, 8))
  // Day is +40 for a female-encoded birth (no gender field to cross-check
  // against here — either parity is accepted as a match).
  const rawDay = Number(code.slice(9, 11))
  // Omocodia (see isValidTaxCodeChecksum.ts's own comment) can replace any
  // of these digits with a letter to disambiguate a collision — vanishingly
  // unlikely for this club's membership size, but Number() would return NaN
  // rather than a wrong date, so don't fail a code we simply can't decode.
  if (Number.isNaN(rawYear) || Number.isNaN(rawDay)) return true

  const day = rawDay > 40 ? rawDay - 40 : rawDay

  return rawYear === bornDate.getFullYear() % 100
    && month === bornDate.getMonth()
    && day === bornDate.getDate()
}
