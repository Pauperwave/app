<!-- app\components\leagues\single\Leaderboard.vue -->
<!--
  PREVIEW ONLY (2026-08-20) — hardcoded mock rows, not wired to real data.
  `tournament_standings` (the table this would actually read from) exists in
  the schema but has 0 rows — nothing populates player_rank/player_score yet
  (see server/api/cittadino.ts's own comment, and the P1 in docs/BACKLOG.md).
  This exists purely so the user can see what a league-scoped "best N of
  total tappe" summary leaderboard could look like on the detail page before
  committing to building the real aggregation once tournament_standings is
  actually populated. Delete this mock array and wire up a real query when
  that data exists — don't extend this file as-is.
-->
<script setup lang="ts">
interface MockRow {
  rank: number
  name: string
  points: number
  countedStages: number
  totalStages: number
}

// Generated, not hand-listed — 40 rows is enough to see how the card behaves
// with a realistically-sized league (scroll, height vs. the sidebar cards),
// not just a 5-row sample.
const FIRST_NAMES = [
  'Marco', 'Giulia', 'Luca', 'Sara', 'Davide', 'Elena', 'Matteo', 'Chiara', 'Andrea', 'Francesca',
  'Alessandro', 'Martina', 'Simone', 'Valentina', 'Riccardo', 'Giorgia', 'Federico', 'Alice', 'Nicola', 'Beatrice'
]
const LAST_NAMES = [
  'Bianchi', 'Rossi', 'Verdi', 'Conti', 'Ferrari', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco',
  'Bruno', 'Gallo', 'Costa', 'Fontana', 'Rizzo', 'Mariani', 'Barbieri', 'Villa', 'Testa', 'Leone'
]
const TOTAL_STAGES = 6

const MOCK_ROWS: MockRow[] = Array.from({ length: 40 }, (_, index) => {
  const rank = index + 1
  return {
    rank,
    name: `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_NAMES[(index + 7) % LAST_NAMES.length]}`,
    points: Math.max(1, 42 - Math.floor(index * 1.3)),
    countedStages: Math.min(TOTAL_STAGES, 3 + (index % 3)),
    totalStages: TOTAL_STAGES
  }
})

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col divide-y divide-default">
    <div
      v-for="row in MOCK_ROWS"
      :key="row.rank"
      class="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
    >
      <span class="w-5 text-center text-sm font-semibold text-muted shrink-0">
        {{ row.rank }}
      </span>
      <AssociateTag :name="row.name" class="flex-1 min-w-0" />
      <span class="text-xs text-muted shrink-0">
        {{ t('league.singleLeaderboardMock.stagesCounted', {
          counted: row.countedStages, total: row.totalStages
        }) }}
      </span>
      <span class="text-sm font-semibold shrink-0 w-10 text-right">
        {{ row.points }}
      </span>
    </div>
  </div>
</template>
