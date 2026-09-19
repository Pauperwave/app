// test\unit\composables\tournaments\prizes\usePrizeDistributionPage.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { usePrizeDistributionPage } from '~/composables/tournaments/prizes/usePrizeDistributionPage'

function makeStandings(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    associateUuid: `player-${index + 1}`,
    label: `Player ${index + 1}`
  }))
}

function packsOf(page: ReturnType<typeof usePrizeDistributionPage>): number[] {
  return page.rows.value.map(row => row.packs)
}

describe('usePrizeDistributionPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts on the reference example: 7 6 5 4 3 3 3 3 out of 34 packs', () => {
    const page = usePrizeDistributionPage(makeStandings(20))

    expect(packsOf(page).slice(0, 8)).toEqual([7, 6, 5, 4, 3, 3, 3, 3])
    expect(page.allocatedTotal.value).toBe(34)
    expect(page.budget.value.distributable).toBe(34)
  })

  it('derives the share of every rewarded row from its real packs', () => {
    const page = usePrizeDistributionPage(makeStandings(20))
    const shares = page.rows.value.slice(0, 8).map(row => row.sharePercent)

    expect(shares).toEqual([40, 30, 20, 10, 0, 0, 0, 0])
  })

  it('has no share for the non-rewarded rows', () => {
    const page = usePrizeDistributionPage(makeStandings(20))
    expect(page.rows.value.slice(8).every(row => row.sharePercent === null)).toBe(true)
  })

  it('keeps the standings order and labels in the rows', () => {
    const page = usePrizeDistributionPage(makeStandings(3))
    expect(page.rows.value.map(row => row.label)).toEqual(['Player 1', 'Player 2', 'Player 3'])
  })

  it('charts only the rewarded placements', () => {
    const page = usePrizeDistributionPage(makeStandings(20))
    expect(page.chartRows.value).toHaveLength(8)
    expect(page.chartRows.value[0]).toEqual({ label: 'Player 1', packs: 7 })
  })

  it('charts everyone when there are fewer players than rewarded placements', () => {
    const page = usePrizeDistributionPage(makeStandings(3))
    expect(page.chartRows.value).toHaveLength(3)
  })

  it('draws the guides from the settings: minimum and cap, no non-rewarded minimum', () => {
    const page = usePrizeDistributionPage(makeStandings(20))
    expect(page.chartGuides.value).toEqual({ minPacks: 3, nonRewardedMinPacks: 0, maxPacks: 7 })
  })

  it('draws the non-rewarded minimum only when someone is outside the rewarded', () => {
    const everyone = usePrizeDistributionPage(makeStandings(8))
    everyone.updateSettings({ nonRewardedMinPacks: 1 })
    expect(everyone.chartGuides.value.nonRewardedMinPacks).toBe(0)

    const some = usePrizeDistributionPage(makeStandings(20))
    some.updateSettings({ totalPacks: 60, nonRewardedMinPacks: 1 })
    expect(some.chartGuides.value.nonRewardedMinPacks).toBe(1)
  })

  it('drops the cap guide when there is no cap', () => {
    const page = usePrizeDistributionPage(makeStandings(20))
    page.updateSettings({ maxPacksPerPlayer: 0 })
    expect(page.chartGuides.value.maxPacks).toBeNull()
  })

  it('moves exactly one pack from another placement on a share step', () => {
    const page = usePrizeDistributionPage(makeStandings(20))
    const before = packsOf(page)

    page.stepShare(4, 1)

    const diffs = packsOf(page).map((packs, rank) => packs - (before[rank] ?? 0))
    expect(diffs[4]).toBe(1)
    expect(diffs.filter(diff => diff === -1)).toHaveLength(1)
    expect(page.allocatedTotal.value).toBe(34)
  })

  it('gives a pack back to another placement on a negative share step', () => {
    const page = usePrizeDistributionPage(makeStandings(20))
    const before = packsOf(page)

    page.stepShare(0, -1)

    const diffs = packsOf(page).map((packs, rank) => packs - (before[rank] ?? 0))
    expect(diffs[0]).toBe(-1)
    expect(diffs.filter(diff => diff === 1)).toHaveLength(1)
  })

  it('sets the requested packs on updatePacks, up to the placement above', () => {
    const page = usePrizeDistributionPage(makeStandings(20))
    page.updateSettings({ maxPacksPerPlayer: 0 })

    page.updatePacks(1, 9)

    // #2 cannot pass #1, which has 7
    expect(packsOf(page)[1]).toBe(7)
    expect(page.allocatedTotal.value).toBe(34)
  })

  it('never puts a lower placement above a higher one after any step', () => {
    const page = usePrizeDistributionPage(makeStandings(20))
    const directions = [1, -1, 1, 1, -1, -1, 1, -1] as const

    for (let step = 0; step < 40; step++) {
      page.stepShare((step * 3) % 8, directions[step % directions.length] ?? 1)
      const rewarded = packsOf(page).slice(0, 8)
      expect(rewarded).toEqual([...rewarded].sort((a, b) => b - a))
    }
  })

  it('gives every rewarded row the packs range it can reach', () => {
    const page = usePrizeDistributionPage(makeStandings(20))
    const first = page.rows.value[0]
    const fifth = page.rows.value[4]

    expect([first?.minPacks, first?.maxPacks]).toEqual([6, 7])
    expect([fifth?.minPacks, fifth?.maxPacks]).toEqual([3, 4])
  })

  it('gives the non-rewarded rows no range to move in', () => {
    const page = usePrizeDistributionPage(makeStandings(20))
    const ninth = page.rows.value[8]
    expect([ninth?.minPacks, ninth?.maxPacks]).toEqual([0, 0])
  })

  it('saves the shares as the custom preset after a manual edit', () => {
    const page = usePrizeDistributionPage(makeStandings(20))
    expect(page.hasCustomShares.value).toBe(false)

    page.stepShare(4, 1)

    expect(page.hasCustomShares.value).toBe(true)
    expect(page.selectedPreset.value).toBe('custom')
  })

  it('restores the custom shares after switching to a preset', () => {
    const page = usePrizeDistributionPage(makeStandings(20))
    page.stepShare(4, 1)
    const customPacks = packsOf(page)

    page.applyDistributionPreset('competitive')
    expect(packsOf(page)).not.toEqual(customPacks)

    page.applyDistributionPreset('custom')
    expect(packsOf(page)).toEqual(customPacks)
  })

  it('reacts to the standings changing', () => {
    const standings = ref(makeStandings(20))
    const page = usePrizeDistributionPage(standings)

    standings.value = makeStandings(5)

    expect(page.rows.value).toHaveLength(5)
    expect(page.rewardedCount.value).toBe(5)
  })
})
