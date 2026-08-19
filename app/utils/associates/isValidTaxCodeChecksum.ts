// app\utils\associates\isValidTaxCodeChecksum.ts
// The official Italian Codice Fiscale check-digit algorithm (Agenzia delle
// Entrate) — associateFormSchema.ts's tax_code validator previously only
// checked shape (16 alphanumeric chars), which let a code like
// "SNNMNLL89R21L378O" (16 chars, but a transposed/duplicated letter) through
// as "valid". Every character (position 1-15, 1-indexed) is scored from
// either the odd or even table depending on its position's parity, regardless
// of whether it's a digit or letter — omocodia (the rule that swaps digits
// for letters at set positions to disambiguate identical codes) means any of
// those 15 positions can legitimately hold either, so both tables cover
// digits AND letters rather than splitting by character type.
const ODD_VALUES: Record<string, number> = {
  0: 1, 1: 0, 2: 5, 3: 7, 4: 9, 5: 13, 6: 15, 7: 17, 8: 19, 9: 21,
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18,
  N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23
}

const EVEN_VALUES: Record<string, number> = {
  0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9,
  A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9, K: 10, L: 11, M: 12,
  N: 13, O: 14, P: 15, Q: 16, R: 17, S: 18, T: 19, U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25
}

const CHECK_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function isValidTaxCodeChecksum(taxCode: string): boolean {
  const code = taxCode.trim().toUpperCase()
  if (!/^[A-Z0-9]{16}$/.test(code)) return false

  let sum = 0
  for (let i = 0; i < 15; i++) {
    const char = code[i]!
    sum += i % 2 === 0 ? ODD_VALUES[char]! : EVEN_VALUES[char]!
  }

  return CHECK_LETTERS[sum % 26] === code[15]
}
