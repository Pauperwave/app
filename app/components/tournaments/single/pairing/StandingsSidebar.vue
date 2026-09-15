<!-- app\components\tournaments\single\pairing\StandingsSidebar.vue -->
<!--
  Live standings sidebar for a Commander round in progress — ported from
  MagicTheGathering/league's StandingsCard.vue (user request, 2026-09-15/17:
  copy the live-standings display as-is), sourced from
  useLiveCommanderStandings.ts (see that composable's own comment on why
  it's "live relative to a save", not "live relative to an unsaved edit"
  like league's own store-backed version). Skips league's own
  developer-view-only per-category points breakdown (kills/brew/play/
  placement icons) — this app has no such dev-mode toggle to gate it behind.
-->
<script setup lang="ts">
import type { LiveCommanderStanding } from '~/composables/tournaments/useLiveCommanderStandings'

const { standings, isEnded } = defineProps<{
  standings: LiveCommanderStanding[]
  isEnded: boolean
}>()

const { t } = useI18n()
const toast = useToast()
const { copy } = useClipboard()

/** How many top rows get the gold/warning rank badge — same cutoff as league. */
const TOP_PLAYER_COUNT = 8
const isTopPlayer = (index: number) => index < TOP_PLAYER_COUNT

const isOpen = ref(true)

const standingsRef = useTemplateRef<HTMLDivElement>('standingsRef')
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(standingsRef)

const standingsText = computed(() =>
  standings.map((s, i) => `${i + 1}. ${s.label} - ${s.score} PT`).join('\n'))

async function handleCopyStandings() {
  await copy(standingsText.value)
  toast.add({ title: t('tournament.single.roundManager.standingsCopiedTitle'), color: 'success' })
}
</script>

<template>
  <div
    ref="standingsRef"
    class="bg-linear-to-b from-primary/10 to-transparent rounded-xl p-3 border-2 border-primary/30 shadow-lg"
    :class="isFullscreen ? 'h-screen w-screen overflow-auto bg-default flex flex-col' : ''"
  >
    <div class="flex items-center justify-end gap-1 mb-1">
      <UTooltip :text="t('tournament.single.roundManager.standingsCopyTooltip')">
        <UButton
          :icon="ICONS.copy"
          color="neutral"
          variant="ghost"
          size="xs"
          :aria-label="t('tournament.single.roundManager.standingsCopyTooltip')"
          @click="handleCopyStandings"
        />
      </UTooltip>
      <UTooltip
        :text="isFullscreen
          ? t('tournament.single.roundManager.standingsExitFullscreenTooltip')
          : t('tournament.single.roundManager.standingsFullscreenTooltip')"
      >
        <UButton
          :icon="isFullscreen ? ICONS.collapse : ICONS.expand"
          color="neutral"
          variant="ghost"
          size="xs"
          :aria-label="isFullscreen
            ? t('tournament.single.roundManager.standingsExitFullscreenTooltip')
            : t('tournament.single.roundManager.standingsFullscreenTooltip')"
          @click="toggleFullscreen"
        />
      </UTooltip>
    </div>

    <UCollapsible v-model:open="isOpen">
      <button type="button" class="flex items-center justify-center gap-1.5 mb-2 w-full cursor-pointer">
        <UIcon
          :name="ICONS.standings"
          class="text-primary"
          :class="isFullscreen ? 'size-8' : 'size-4'"
        />
        <h4 class="font-bold text-primary" :class="isFullscreen ? 'text-3xl' : 'text-base'">
          {{ isEnded
            ? t('tournament.single.roundManager.standingsFinal')
            : t('tournament.single.roundManager.standingsPartial') }}
        </h4>
        <UIcon
          :name="ICONS.chevronDown"
          class="size-3.5 text-primary transition-transform"
          :class="isOpen ? '' : '-rotate-90'"
        />
      </button>

      <template #content>
        <div v-if="standings.length > 0" class="space-y-1">
          <div
            v-for="(standing, index) in standings"
            :key="standing.playerUuid"
            class="flex items-center justify-between bg-elevated rounded-lg"
            :class="isFullscreen ? 'p-3' : 'p-1.5'"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span
                class="flex items-center justify-center rounded-full font-bold shrink-0"
                :class="[
                  isTopPlayer(index) ? 'bg-warning/20 text-warning' : 'bg-primary/20 text-primary',
                  isFullscreen ? 'w-10 h-10 text-xl' : 'w-5 h-5 text-xs'
                ]"
              >
                {{ index + 1 }}
              </span>
              <AssociateTag
                :name="standing.label"
                :associate-uuid="standing.associateUuid"
                :size="isFullscreen ? 'lg' : 'sm'"
                class="font-medium truncate"
                :class="isFullscreen ? 'text-2xl' : 'text-sm'"
              />
            </div>
            <span
              class="font-bold shrink-0"
              :class="[isTopPlayer(index) ? 'text-warning' : 'text-primary', isFullscreen ? 'text-3xl' : 'text-base']"
            >{{ standing.score }} PT</span>
          </div>
        </div>

        <EmptyState
          v-else
          :message="t('tournament.single.roundManager.standingsEmpty')"
        />
      </template>
    </UCollapsible>
  </div>
</template>
