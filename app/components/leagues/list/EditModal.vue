<!-- app\components\leagues\list\EditModal.vue -->
<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import type * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { League } from '~/types'
import type { NewLeaguePayload } from '#shared/types/leagues'
import type { LeagueFormState } from '~/composables/leagues/useLeagueFormFields'

const open = defineModel<boolean>({ default: false })
const { league } = defineProps<{ league: League | null }>()

const toast = useToast()
const { t } = useI18n()
const { updateLeague } = useLeaguesMutations()

// Same shape as AddModal.vue's initial state — same reasoning as
// tournaments/list/EditModal.vue's own state literal.
const state = reactive<LeagueFormState>({
  name: undefined,
  status: 'draft',
  startDate: undefined,
  rulesetUuid: undefined
})

const { startDate, formattedStartDate } = useStartDateField(state, { defaultToToday: false })

// Refills every time the modal opens on a (possibly new) league — same
// convention as TournamentsListEditModal.vue's watch on its `tournament` prop.
watch([open, () => league], ([isOpen, current]) => {
  if (!isOpen || !current) return

  const startsAt = new Date(current.startDate)
  startDate.value = new CalendarDate(
    startsAt.getFullYear(), startsAt.getMonth() + 1, startsAt.getDate()
  )

  state.name = current.name
  state.status = current.status
  state.startDate = current.startDate.substring(0, 10)
  state.rulesetUuid = current.rulesetUuid ?? undefined
}, { immediate: true })

const { schema, statusOptions, rulesetOptions } = useLeagueFormFields()

type Schema = v.InferOutput<typeof schema>

const submitting = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!league) return

  const startsAt = dateValueToDate(startDate.value!)

  const payload: NewLeaguePayload = {
    name: event.data.name,
    status: event.data.status,
    rulesetUuid: event.data.rulesetUuid || null,
    startsAt: startsAt.toISOString(),
    endsAt: null
  }

  submitting.value = true
  try {
    await updateLeague.mutateAsync({ id: league.id, edits: payload })
    toast.add({
      title: t('league.editModal.successToastTitle'),
      color: 'success'
    })
    open.value = false
  } catch (err) {
    toast.add({
      title: t('league.editModal.errorToastTitle'),
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
    :ui="{ content: 'max-w-xl' }"
    :title="$t('league.editModal.title')"
  >
    <template #body>
      <UForm
        v-if="league"
        :schema="schema"
        :state="state"
        class="space-y-6"
        @submit="onSubmit"
      >
        <LeaguesFieldsLeagueDataFields
          v-model:start-date="startDate"
          :state="state"
          :status-options="statusOptions"
          :ruleset-options="rulesetOptions"
          :formatted-start-date="formattedStartDate"
        />

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            :label="$t('league.editModal.cancel')"
            color="neutral"
            variant="ghost"
            :disabled="submitting"
            @click="open = false"
          />
          <UButton
            :label="$t('league.editModal.save')"
            :icon="ICONS.confirm"
            type="submit"
            :loading="submitting"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
