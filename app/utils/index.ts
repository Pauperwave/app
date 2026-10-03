// app\utils\index.ts
// The association's founding year: statistics charts plot from here, not from their earliest data
// point, so early flat years aren't dropped off the axis
export const PAUPERWAVE_FOUNDING_YEAR = 2020

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function randomFrom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]!
}
