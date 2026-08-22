<!-- app\components\leagues\single\AddTournamentsModal.vue -->
<!--
  The reverse direction of TournamentsListBulkActionsBar.vue's "assign to
  league" bulk action (user request, 2026-08-22, "give the user more ways to
  do the same thing") — instead of selecting tournaments first and picking a
  league, this starts from the league's own detail page and picks existing
  tournaments to pull in. Every tournament is selectable, not just unlinked
  ones: an already-linked tournament shows which league it currently belongs
  to (`alreadyInLeague`) so picking it is an informed "move it here" rather
  than a silent steal, but nothing is hidden or blocked.
-->
<script setup lang="ts">
import type { League } from '~/types'

const { league } = defineProps<{ league: League }>()
const { t } = useI18n()
const toast = useToast()

const open = defineModel<boolean>({ default: false })

const { data: tournamentsData } = useTournamentsQuery()
const { setLeague } = useTournamentsMutations()

const tournamentOptions = computed(() => (tournamentsData.value ?? [])
  .filter(tournament => tournament.leagueUuid !== league.uuid)
  .map(tournament => ({
    value: tournament.id,
    label: tournament.league
      ? `${tournament.name}${tournamentStageText(tournament)} (${t('league.detail.addTournaments.alreadyInLeague', { league: tournament.league })})`
      : `${tournament.name}${tournamentStageText(tournament)}`
  })))

const pickedIds = ref<number[]>([])
const submitting = ref(false)

async function onConfirm() {
  if (!pickedIds.value.length) return

  submitting.value = true
  try {
    const results = await Promise.allSettled(
      pickedIds.value.map(id => setLeague.mutateAsync({ id, leagueUuid: league.uuid }))
    )
    const failed = results.filter(result => result.status === 'rejected').length
    const succeeded = results.length - failed

    toast.add({
      title: t('league.detail.addTournaments.successToast', succeeded),
      description: failed > 0 ? t('tournament.bulkActions.partialFailure', failed) : undefined,
      color: failed > 0 ? 'warning' : 'success'
    })
    open.value = false
    pickedIds.value = []
  } catch (err) {
    toast.add({
      title: t('league.detail.addTournaments.errorToastTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('league.detail.addTournaments.modalTitle', { league: league.name })"
    :ui="{ content: 'max-w-md' }"
  >
    <template #body>
      <div class="space-y-4">
        <USelectMenu
          v-model="pickedIds"
          multiple
          class="w-full"
          :items="tournamentOptions"
          value-key="value"
          :placeholder="t('league.detail.addTournaments.placeholder')"
          :icon="ICONS.battle"
        />

        <div class="flex justify-end gap-2">
          <UButton
            :label="t('league.detail.addTournaments.cancel')"
            color="neutral"
            variant="ghost"
            :disabled="submitting"
            @click="open = false; pickedIds = []"
          />
          <UButton
            :label="t('league.detail.addTournaments.confirm')"
            :disabled="!pickedIds.length"
            :loading="submitting"
            @click="onConfirm"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
