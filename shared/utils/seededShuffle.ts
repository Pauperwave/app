// shared\utils\seededShuffle.ts
// Reproducible table assignment: the same seed over the same set of players always gives the
// same shuffle. Internally a seed is an integer; people see it as a short code such as "SEC-123"
// (3 letters + 3 digits) that is easy to read out loud and type back in.
const LETTERS_COUNT = 26 ** 3
const DIGITS_COUNT = 1_000

// 26^3 x 1000 = 17,576,000 codes.
export const MAX_SHUFFLE_SEED = LETTERS_COUNT * DIGITS_COUNT - 1

export function randomShuffleSeed(): number {
  return Math.floor(Math.random() * (MAX_SHUFFLE_SEED + 1))
}

const letter = (index: number) => String.fromCharCode(65 + index)

// 0 -> "AAA-000", 1 -> "AAA-001", 1000 -> "AAB-000": the letters are the "thousands" of the seed.
export function formatShuffleSeed(seed: number): string {
  const lettersIndex = Math.floor(seed / DIGITS_COUNT)
  const letters = [
    Math.floor(lettersIndex / 676),
    Math.floor(lettersIndex / 26) % 26,
    lettersIndex % 26
  ].map(letter).join('')
  return `${letters}-${String(seed % DIGITS_COUNT).padStart(3, '0')}`
}

// Accepts "SEC-123" in any case, with the dash optional or replaced by a space.
export function parseShuffleSeed(value: unknown): number | null {
  const match = String(value ?? '').trim().toUpperCase().match(/^([A-Z]{3})[\s-]?(\d{3})$/)
  const letters = match?.[1]
  const digits = match?.[2]
  if (!letters || !digits) return null

  const lettersIndex = [...letters]
    .reduce((total, char) => total * 26 + char.charCodeAt(0) - 65, 0)
  return lettersIndex * DIGITS_COUNT + Number(digits)
}

// mulberry32 — small, fast, good enough for seating players.
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6D2B79F5) >>> 0
    let mixed = state
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

// Fisher-Yates over the ids sorted first: the result depends only on the seed and on WHO plays,
// not on the order they happen to be in (e.g. after an earlier shuffle or manual drags).
export function seededShuffle(ids: string[], seed: number): string[] {
  const result = [...ids].sort()
  const random = createSeededRandom(seed)
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const current = result[i]
    const other = result[j]
    if (current === undefined || other === undefined) continue
    result[i] = other
    result[j] = current
  }
  return result
}
