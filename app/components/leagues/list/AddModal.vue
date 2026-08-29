<!-- app\components\leagues\list\AddModal.vue -->
<script setup lang="ts">
import type * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { NewLeaguePayload } from '#shared/types/leagues'
import type { LeagueFormState } from '~/composables/leagues/useLeagueFormFields'
import type { League } from '~/types'

const open = defineModel<boolean>({ default: false })

// sourceLeague is the "Copia lega" context-menu action (user request,
// 2026-08-29), same convention as TournamentsListAddModal.vue's own
// sourceTournament — copies every field except status (reset to draft).
// hideTrigger mirrors that component too: this instance is opened
// programmatically by the copy action, not its own AddButton.
const { sourceLeague, hideTrigger = false } = defineProps<{
  sourceLeague?: League | null
  hideTrigger?: boolean
}>()

const toast = useToast()
const { t } = useI18n()

const { createLeague } = useLeaguesMutations()

function createInitialState(): LeagueFormState {
  const source = sourceLeague
  return {
    name: source?.name ?? '',
    status: 'draft',
    rulesetUuid: source?.rulesetUuid ?? undefined
  }
}

const state = reactive<LeagueFormState>(createInitialState())

// Kept out of `state`/the valibot schema (no format validation needed) —
// same convention as TournamentsListAddModal.vue's `image`. imageCardName/
// imageCardArtist ride along for the same reason — see CardArtPicker.vue.
const image = ref<string | undefined>(undefined)
const imageCardName = ref<string | undefined>(undefined)
const imageCardArtist = ref<string | undefined>(undefined)

// Re-applies sourceLeague every time the modal opens, not just on mount —
// same reasoning as TournamentsListAddModal.vue's own watch(open, ...): this
// instance is reused across different "Copia lega" clicks while it stays
// alive.
watch(open, (isOpen) => {
  if (!isOpen || !sourceLeague) return
  Object.assign(state, createInitialState())
  image.value = sourceLeague.image ?? undefined
  imageCardName.value = sourceLeague.imageCardName ?? undefined
  imageCardArtist.value = sourceLeague.imageCardArtist ?? undefined
})

const { schema, statusOptions, rulesetOptions } = useLeagueFormFields()

type Schema = v.InferOutput<typeof schema>

// UModal only hides/shows, it does not unmount the form, so the state has to
// be cleared explicitly — called on successful submit and on explicit
// "Annulla", but deliberately NOT on the X button or an outside click, which
// should preserve whatever the user typed (user decision 2026-08-20).
function resetForm() {
  Object.assign(state, createInitialState())
  image.value = undefined
  imageCardName.value = undefined
  imageCardArtist.value = undefined
}

// fallow-ignore-next-line code-duplication -- see the same comment in
// events/list/AddModal.vue
async function onSubmit(event: FormSubmitEvent<Schema>) {
  const payload: NewLeaguePayload = {
    name: event.data.name,
    status: event.data.status,
    rulesetUuid: event.data.rulesetUuid || null,
    imageUrl: image.value ?? null,
    imageCardName: imageCardName.value ?? null,
    imageCardArtist: imageCardArtist.value ?? null
  }

  try {
    await createLeague.mutateAsync(payload)
    toast.add({
      title: t('league.addModal.successToastTitle'),
      description: t('league.addModal.successToastDescription', { name: payload.name }),
      color: 'success'
    })
    open.value = false
    resetForm()
  } catch (err) {
    toast.add({
      title: t('league.addModal.errorToastTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'max-w-xl' }"
    :title="$t('league.addModal.title')"
    :description="$t('league.addModal.description')"
  >
    <AddButton
      v-if="!hideTrigger"
      :label="$t('league.addModal.openButton')"
      :icon="ICONS.standings"
      @click="open = true"
    />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <div class="space-y-2">
          <p class="text-lg font-semibold text-primary">
            {{ $t('league.addModal.leagueData') }}
          </p>

          <LeaguesFieldsLeagueDataFields
            v-model:image="image"
            v-model:image-card-name="imageCardName"
            v-model:image-card-artist="imageCardArtist"
            :state="state"
            :status-options="statusOptions"
            :ruleset-options="rulesetOptions"
          />
        </div>

        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('league.addModal.cancel')"
            color="neutral"
            variant="ghost"
            @click="open = false; resetForm()"
          />
          <UButton
            :label="$t('league.addModal.create')"
            :icon="ICONS.confirm"
            type="submit"
            :loading="createLeague.isLoading.value"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
