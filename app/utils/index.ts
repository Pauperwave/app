// app\utils\index.ts
// The association's actual founding year — statistics charts (growth,
// tournaments per year) plot from here, not from whatever their earliest
// data point happens to be, so early flat/zero years aren't silently
// dropped off the axis.
export const PAUPERWAVE_FOUNDING_YEAR = 2020

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function randomFrom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]!
}
