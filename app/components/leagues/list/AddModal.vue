<!-- app\components\leagues\list\AddModal.vue -->
<script setup lang="ts">
import * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { NewLeaguePayload } from '#shared/types/leagues'

const open = defineModel<boolean>({ default: false })
const toast = useToast()
const { t } = useI18n()

// Migrated off the name/email placeholder stub onto the real `leagues` table
// (2026-08-15) — rulesets, see useRulesetsQuery.ts (same shared-lookup
// convention as tournaments'/events' AddModal.vue).
const { data: rulesets } = useRulesetsQuery()
const { createLeague } = useLeaguesMutations()

const statusOptions = computed(() => LEAGUE_STATUSES.map(status => ({
  value: status,
  label: t(`league.addModal.statusOptions.${status}`),
  icon: LEAGUE_STATUS_ICONS[status],
  color: leagueStatusColor(status)
})))

const rulesetOptions = computed(() => (rulesets.value ?? []).map(ruleset => ({
  value: ruleset.uuid, label: ruleset.name
})))

const todayString = new Date().toISOString().substring(0, 10)

const schema = v.object({
  status: v.picklist(LEAGUE_STATUSES),
  name: v.pipe(v.string(), v.minLength(1, t('league.addModal.validation.nameRequired'))),
  season: v.optional(v.nullable(v.string())),
  startDate: v.string(),
  rulesetUuid: v.optional(v.string())
})

type Schema = v.InferOutput<typeof schema>

function createInitialState(): Schema {
  return {
    name: '',
    status: 'draft',
    season: undefined,
    startDate: todayString,
    rulesetUuid: undefined
  }
}

const state = reactive<Schema>(createInitialState())

const { startDate, formattedStartDate, reset: resetStartDate } = useStartDateField(state)

// fallow-ignore-next-line code-duplication -- see the same comment in
// events/list/AddModal.vue
async function onSubmit(event: FormSubmitEvent<Schema>) {
  const startsAt = dateValueToDate(startDate.value!)

  const payload: NewLeaguePayload = {
    name: event.data.name,
    status: event.data.status,
    season: event.data.season || null,
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

          <div class="flex justify-between gap-2">
            <div class="flex-1">
              <UStatusSelect
                v-model="state.status"
                :items="statusOptions"
                name="status"
                :label="$t('league.addModal.fields.status')"
                class="w-full"
              />
            </div>

            <UFormField :label="$t('league.addModal.fields.season')" name="season">
              <UInput
                :model-value="state.season ?? ''"
                :placeholder="$t('league.addModal.fields.seasonPlaceholder')"
                class="w-42"
                @update:model-value="state.season = ($event as string) || undefined"
              />
            </UFormField>
          </div>

          <!-- eslint-disable-next-line -->
          <UFormField :label="$t('league.addModal.fields.name')" name="name" required>
            <UInput
              v-model="state.name"
              class="w-full"
              :placeholder="$t('league.addModal.fields.namePlaceholder')"
              :icon="ICONS.standings"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <StartDatePickerField
              v-model:start-date="startDate"
              :label="$t('event.addModal.fields.startDate')"
              :formatted-start-date="formattedStartDate"
            />

            <UFormField :label="$t('league.addModal.fields.ruleset')" name="rulesetUuid">
              <USelectMenu
                v-model="state.rulesetUuid"
                class="w-full"
                :items="rulesetOptions"
                value-key="value"
                :placeholder="$t('league.addModal.fields.selectRuleset')"
                :icon="ICONS.bookOpen"
              />
            </UFormField>
          </div>
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
