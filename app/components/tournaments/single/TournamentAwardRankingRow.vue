<!-- app\components\tournaments\single\TournamentAwardRankingRow.vue -->
<!-- One player in an award's ranking; a click asks to open their "pagella". -->
<script setup lang="ts">
import type {
  TournamentAwardKind, TournamentAwardRankingEntry, TournamentTiebreakValue
} from '~/composables/tournaments/prizes/useTournamentAwards'
import { TOURNAMENT_AWARD_ICONS } from '~/utils/tournaments/tournamentAwardIcons'

const { kind, entry } = defineProps<{
  kind: TournamentAwardKind
  entry: TournamentAwardRankingEntry
}>()

const emit = defineEmits<{
  select: [playerUuid: string]
}>()

const { t } = useI18n()

const icon = computed(() => TOURNAMENT_AWARD_ICONS[kind])
const isFirst = computed(() => entry.position === 1)

const rateFormat = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 })

// The per-round tiebreaks are rates, the others plain counts.
function tiebreakLabel({ id, value }: TournamentTiebreakValue) {
  const isRate = id === 'killsPerRound' || id === 'deathsPerRound'
  return t(
    `tournament.single.awards.tiebreaks.${id}`,
    isRate ? { rate: rateFormat.format(value) } : { count: value }
  )
}

// Shown under the name so the order between tied players explains itself.
const tiebreakLine = computed(() => entry.tiebreaks.map(tiebreakLabel).join(' · '))

// The row shows "3" + the stat's icon; the full wording ("3 uccisioni") stays as tooltip and
// for screen readers.
const valueLabel = computed(() => t(`tournament.single.awards.${kind}.stat`, { count: entry.value }))
</script>

<template>
  <button
    type="button"
    class="group flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-elevated focus-visible:bg-elevated"
    :title="t('tournament.single.roundManager.standingsDetailButton')"
    @click="emit('select', entry.playerUuid)"
  >
    <!-- A tied position carries an "=" next to the number, the tooltip spells it out. -->
    <UTooltip
      :text="t('tournament.single.awards.tied')"
      :disabled="!entry.isTied"
    >
      <UBadge
        :color="isFirst ? 'primary' : 'neutral'"
        :variant="isFirst ? 'solid' : 'subtle'"
        size="sm"
        class="w-9 shrink-0 justify-center gap-0.5 tabular-nums"
      >
        {{ entry.position }}
        <UIcon
          v-if="entry.isTied"
          :name="ICONS.equal"
          class="size-3"
        />
      </UBadge>
    </UTooltip>

    <!-- Right after the position, in a fixed-width column: values line up and there is no gap
         between the name and the value. -->
    <span
      class="inline-flex w-12 shrink-0 items-center gap-1 font-semibold tabular-nums"
      :title="valueLabel"
      :aria-label="valueLabel"
    >
      {{ entry.value }}
      <UIcon
        :name="icon"
        class="size-4 text-muted"
      />
    </span>

    <div class="min-w-0 flex-1">
      <AssociateTag
        :name="entry.firstName"
        :surname="entry.surname"
        :associate-uuid="entry.associateUuid"
      />
      <p class="truncate text-xs text-muted">
        {{ tiebreakLine }}
      </p>
    </div>

    <!-- The row opens the player's "pagella": the chevron is the cue, the tooltip names it. -->
    <UIcon
      :name="ICONS.chevronRight"
      class="size-4 shrink-0 text-muted group-hover:text-default"
    />
  </button>
</template>
