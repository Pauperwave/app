<!-- app\components\tournaments\list\BulkActionsBar.vue -->
<!--
  Shown only while at least one tournament is selected (useSelection.ts) —
  shared between the table and grid views, which both feed the same
  selection. Same shape/reasoning as WantedCardsListBulkActionsBar.vue,
  including the "swap, don't insert a row" trick — see that file's header
  comment.
-->
<script setup lang="ts">
import type { TournamentStatus } from '~/types'

const { count, side } = defineProps<{ count: number, side: 'left' | 'right' }>()

const emit = defineEmits<{
  clear: []
  markStatus: [status: TournamentStatus]
  setImage: [imageUrl: string, imageCardName: string | null, imageCardArtist: string | null]
  setEntryFee: [entryFee: number]
  setLeague: [leagueUuid: string | null, leagueName: string]
  delete: []
}>()

const { t } = useI18n()

const statusItems = computed(() => TOURNAMENT_STATUSES.map(status => ({
  label: t(`tournament.status.${status}`),
  icon: TOURNAMENT_STATUS_ICONS[status],
  color: tournamentStatusColor(status),
  value: status
})))

// TournamentsSetImageModal owns the picker UI/state — confirm here just
// forwards it and closes immediately (matches markStatus/delete, which
// both route through ConfirmModal in index.vue without awaiting first).
const imageModalOpen = ref(false)

function confirmImage(imageUrl: string, cardName: string | null, artist: string | null) {
  emit('setImage', imageUrl, cardName, artist)
  imageModalOpen.value = false
}

// Same "own modal + explicit confirm" shape as the image action above.
const entryFeeModalOpen = ref(false)
const pickedEntryFee = ref<number | undefined>(undefined)

function confirmEntryFee() {
  if (pickedEntryFee.value === undefined) return
  emit('setEntryFee', pickedEntryFee.value)
  entryFeeModalOpen.value = false
  pickedEntryFee.value = undefined
}

// League picker (user request, 2026-08-22, "give the user more ways" to
// link existing tournaments to a league): same "own modal + explicit
// confirm" shape, but its USelectMenu is creatable — typing a name with no
// match offers "Crea <name>", which creates the league right here (so the
// two scenarios the user described, an existing league vs. one created
// from the selection, both resolve to the same emit) before closing.
// pendingCreatedLeague + a dedup-by-value computed, not a separate ref
// re-synced by a watcher + manual pushes (that combination showed the same
// freshly-created league twice — the watcher's replace and the manual push
// raced instead of composing, since both mutated the same array). A pure
// computed can't race with itself.
const { data: existingLeagues } = useLeaguesQuery()
const leagueOptions = computed(() => (existingLeagues.value ?? []).map(league => ({
  value: league.uuid, label: league.name
})))
const pendingCreatedLeague = ref<{ value: string, label: string } | null>(null)
const dynamicLeagueOptions = computed(() => {
  if (!pendingCreatedLeague.value) return leagueOptions.value
  if (leagueOptions.value.some(option => option.value === pendingCreatedLeague.value!.value)) {
    return leagueOptions.value
  }
  return [...leagueOptions.value, pendingCreatedLeague.value]
})

const leagueModalOpen = ref(false)
const pickedLeagueUuid = ref<string | undefined>(undefined)
const { createLeague } = useLeaguesMutations()
const toast = useToast()

async function onCreateLeague(name: string) {
  try {
    const { league } = await createLeague.mutateAsync({
      name,
      status: 'draft',
      rulesetUuid: null,
      imageUrl: null,
      imageCardName: null,
      imageCardArtist: null
    })
    pendingCreatedLeague.value = { value: league.uuid, label: league.name }
    pickedLeagueUuid.value = league.uuid
  } catch (err) {
    toast.add({
      title: t('league.addModal.errorToastTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  }
}

function confirmLeague() {
  if (!pickedLeagueUuid.value) return
  const leagueName = dynamicLeagueOptions.value
    .find(option => option.value === pickedLeagueUuid.value)?.label ?? ''
  emit('setLeague', pickedLeagueUuid.value, leagueName)
  closeLeagueModal()
}

function closeLeagueModal() {
  leagueModalOpen.value = false
  pickedLeagueUuid.value = undefined
  pendingCreatedLeague.value = null
}
</script>

<template>
  <div v-if="side === 'left'" class="flex items-center gap-3 flex-wrap">
    <span class="text-sm text-muted">
      {{ t('tournament.bulkActions.selectedCount', count) }}
    </span>

    <UButton
      :label="t('tournament.bulkActions.clearSelection')"
      color="neutral"
      variant="ghost"
      @click="$emit('clear')"
    />
  </div>

  <div v-else class="flex items-center gap-2 flex-wrap">
    <UDropdownMenu
      :items="statusItems.map(item => ({
        label: item.label,
        icon: item.icon,
        color: item.color,
        onSelect: () => $emit('markStatus', item.value)
      }))"
    >
      <UButton
        :label="t('tournament.bulkActions.markAs')"
        color="neutral"
        variant="outline"
        :trailing-icon="ICONS.chevronDown"
      />
    </UDropdownMenu>

    <UButton
      :label="t('tournament.bulkActions.setImage')"
      :icon="ICONS.image"
      color="neutral"
      variant="outline"
      @click="imageModalOpen = true"
    />

    <UButton
      :label="t('tournament.bulkActions.setEntryFee')"
      :icon="ICONS.euro"
      color="neutral"
      variant="outline"
      @click="entryFeeModalOpen = true"
    />

    <UButton
      :label="t('tournament.bulkActions.setLeague')"
      :icon="ICONS.standings"
      color="neutral"
      variant="outline"
      @click="leagueModalOpen = true"
    />

    <UButton
      :label="t('tournament.rowActions.delete')"
      :icon="ICONS.delete"
      color="error"
      variant="outline"
      @click="$emit('delete')"
    />
  </div>

  <TournamentsSetImageModal
    v-model:open="imageModalOpen"
    :title="t('tournament.bulkActions.setImageModalTitle', count)"
    @confirm="confirmImage"
  />

  <UModal
    v-model:open="entryFeeModalOpen"
    :title="t('tournament.bulkActions.setEntryFeeModalTitle', count)"
    :ui="{ content: 'max-w-sm' }"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField :label="$t('tournament.addModal.fields.entryFee')">
          <UInputNumber
            v-model="pickedEntryFee"
            :min="0"
            :step="5"
            class="w-full"
            :icon="ICONS.euro"
          />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="ghost"
            @click="entryFeeModalOpen = false; pickedEntryFee = undefined"
          />
          <UButton
            :label="t('tournament.bulkActions.confirm')"
            :disabled="pickedEntryFee === undefined"
            @click="confirmEntryFee"
          />
        </div>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="leagueModalOpen"
    :title="t('tournament.bulkActions.setLeagueModalTitle', count)"
    :ui="{ content: 'max-w-sm' }"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField
          :label="$t('tournament.addModal.fields.league')"
          :description="t('tournament.bulkActions.setLeagueHint')"
        >
          <USelectMenu
            v-model="pickedLeagueUuid"
            class="w-full"
            :items="dynamicLeagueOptions"
            value-key="value"
            create-item
            :placeholder="$t('tournament.addModal.fields.linkLeague')"
            :icon="ICONS.standings"
            @create="onCreateLeague"
          >
            <template #create-item-label="{ item }">
              {{ t('tournament.bulkActions.createLeagueOption', { name: item }) }}
            </template>
          </USelectMenu>
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="ghost"
            @click="closeLeagueModal"
          />
          <UButton
            :label="t('tournament.bulkActions.confirm')"
            :disabled="!pickedLeagueUuid"
            @click="confirmLeague"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
