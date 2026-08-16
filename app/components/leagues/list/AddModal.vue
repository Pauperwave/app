<!-- app\components\leagues\list\AddModal.vue -->
<script setup lang="ts">
import type * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { NewLeaguePayload } from '#shared/types/leagues'
import type { LeagueFormState } from '~/composables/leagues/useLeagueFormFields'

const open = defineModel<boolean>({ default: false })
const toast = useToast()
const { t } = useI18n()

const { createLeague } = useLeaguesMutations()

const todayString = new Date().toISOString().substring(0, 10)

function createInitialState(): LeagueFormState {
  return {
    name: '',
    status: 'draft',
    startDate: todayString,
    rulesetUuid: undefined
  }
}

const state = reactive<LeagueFormState>(createInitialState())

const { startDate, formattedStartDate, reset: resetStartDate } = useStartDateField(state)

const { schema, statusOptions, rulesetOptions } = useLeagueFormFields()

type Schema = v.InferOutput<typeof schema>

// fallow-ignore-next-line code-duplication -- see the same comment in
// events/list/AddModal.vue
async function onSubmit(event: FormSubmitEvent<Schema>) {
  const startsAt = dateValueToDate(startDate.value!)

  const payload: NewLeaguePayload = {
    name: event.data.name,
    status: event.data.status,
    rulesetUuid: event.data.rulesetUuid || null,
    startsAt: startsAt.toISOString(),
    endsAt: null
  }

  try {
    await createLeague.mutateAsync(payload)
    toast.add({
      title: t('league.addModal.successToastTitle'),
      description: t('league.addModal.successToastDescription', { name: payload.name }),
      color: 'success'
    })
    open.value = false
    Object.assign(state, createInitialState())
    resetStartDate()
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
      :label="$t('league.addModal.openButton')"
      :icon="ICONS.standings"
      @click="open = true"
    />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-6"
        @submit="onSubmit"
      >
        <div class="space-y-4">
          <p class="text-lg font-semibold text-primary">
            {{ $t('league.addModal.leagueData') }}
          </p>

          <LeaguesFieldsLeagueDataFields
            v-model:start-date="startDate"
            :state="state"
            :status-options="statusOptions"
            :ruleset-options="rulesetOptions"
            :formatted-start-date="formattedStartDate"
          />
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            :label="$t('league.addModal.cancel')"
            color="neutral"
            variant="ghost"
            @click="open = false"
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
