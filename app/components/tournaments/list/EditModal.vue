<!-- app\components\tournaments\list\EditModal.vue -->
<script setup lang="ts">
import { CalendarDate, getLocalTimeZone } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import type * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Tournament } from '~/types'
import type { NewTournamentPayload } from '#shared/types/tournaments'
import type { TournamentFormState } from '~/composables/tournaments/useTournamentFormFields'

const open = defineModel<boolean>({ default: false })
const { tournament } = defineProps<{ tournament: Tournament | null }>()

const toast = useToast()
const { t } = useI18n()
const { updateTournament } = useTournamentsMutations()

// Same shape as AddModal.vue's initial state — formatUuid/organizerUuid/
// locationUuid must be present (even as undefined) or valibot's v.object()
// raises its own generic "missing key" issue instead of running the field's
// real check. The [open, tournament] watch below fills these immediately in
// practice, but this keeps the object shape correct even before that watch
// runs.
const state = reactive<TournamentFormState>({
  name: undefined,
  status: 'draft',
  startDate: undefined,
  startTime: undefined,
  roundCount: undefined,
  formatUuid: undefined,
  description: undefined,
  prizes: undefined,
  organizerUuid: undefined,
  locationUuid: undefined,
  entryFee: undefined,
  companionCode: undefined
})

const startDate = shallowRef<DateValue>()

// Refills every time the modal opens on a (possibly new) tournament — same
// convention as TransactionsListEditModal.vue's watch on its `transaction` prop.
watch([open, () => tournament], ([isOpen, current]) => {
  if (!isOpen || !current) return

  const startsAt = new Date(current.startDate)
  startDate.value = new CalendarDate(
    startsAt.getFullYear(), startsAt.getMonth() + 1, startsAt.getDate()
  )

  state.name = current.name
  state.status = current.status
  state.startDate = current.startDate.substring(0, 10)
  state.startTime = startsAt.toTimeString().substring(0, 5)
  state.roundCount = current.roundCount ?? 1
  state.formatUuid = current.formatUuid
  state.description = current.description ?? undefined
  state.prizes = current.prizes ?? undefined
  state.organizerUuid = current.organizerUuid ?? undefined
  state.locationUuid = current.locationUuid ?? undefined
  state.entryFee = current.entryFee ?? 0
  state.companionCode = current.companionCode ?? undefined
}, { immediate: true })

watch(startDate, (newDate) => {
  if (newDate) {
    state.startDate = `${newDate.year}-${String(newDate.month).padStart(2, '0')}-${String(newDate.day).padStart(2, '0')}`
  }
})

const formattedStartDate = computed(() => {
  if (!startDate.value) return ''
  const date = new Date(startDate.value.year, startDate.value.month - 1, startDate.value.day)
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
})

const {
  schema, statusOptions, locationOptions, organizerOptions, formatOptions, selectedStatus
} = useTournamentFormFields(state)

type Schema = v.InferOutput<typeof schema>

const submitting = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!tournament) return

  const [hours, minutes] = event.data.startTime.split(':').map(Number)
  const startsAt = new CalendarDate(
    startDate.value!.year, startDate.value!.month, startDate.value!.day
  ).toDate(getLocalTimeZone())
  startsAt.setHours(hours ?? 0, minutes ?? 0, 0, 0)

  const payload: NewTournamentPayload = {
    name: event.data.name ?? '',
    status: event.data.status,
    formatUuid: event.data.formatUuid,
    locationUuid: event.data.locationUuid || null,
    organizerUuid: event.data.organizerUuid || null,
    leagueUuid: tournament.leagueUuid,
    eventUuid: tournament.eventUuid,
    startsAt: startsAt.toISOString(),
    endsAt: tournament.endDate,
    roundCount: event.data.roundCount,
    entryFee: event.data.entryFee,
    description: event.data.description || null,
    prizes: event.data.prizes || null,
    companionCode: event.data.companionCode || null
  }

  submitting.value = true
  try {
    await updateTournament.mutateAsync({ id: tournament.id, edits: payload })
    toast.add({
      title: t('tournament.editModal.successToastTitle'),
      color: 'success'
    })
    open.value = false
  } catch (err) {
    toast.add({
      title: t('tournament.editModal.errorToastTitle'),
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
    :title="$t('tournament.editModal.title')"
  >
    <template #body>
      <UForm
        v-if="tournament"
        :schema="schema"
        :state="state"
        class="space-y-6"
        @submit="onSubmit"
      >
        <div class="space-y-4">
          <div class="flex justify-between gap-2">
            <UFormField :label="$t('tournament.addModal.fields.status')" class="flex-1" name="status">
              <USelect
                v-model="state.status"
                :items="statusOptions"
                value-key="value"
                class="w-full"
              >
                <template #leading>
                  <UIcon v-if="selectedStatus" :name="selectedStatus.icon" class="size-5 shrink-0" />
                </template>
              </USelect>
            </UFormField>

            <UFormField
              :label="$t('tournament.addModal.fields.companionCode')"
              name="companionCode"
            >
              <UInput
                :model-value="state.companionCode ?? ''"
                :placeholder="$t('tournament.addModal.fields.companionCodePlaceholder')"
                :icon="ICONS.smartphone"
                class="w-42"
                @update:model-value="state.companionCode = ($event as string) || undefined"
              />
            </UFormField>
          </div>

          <div class="flex items-end gap-2">
            <!-- eslint-disable-next-line -->
            <UFormField :label="$t('tournament.addModal.fields.name')" name="name" class="flex-1" required>
              <UInput
                v-model="state.name"
                class="w-full"
                :placeholder="$t('tournament.addModal.fields.namePlaceholder')"
                :icon="ICONS.standings"
              />
            </UFormField>

            <UFormField :label="$t('tournament.addModal.fields.entryFee')" name="entryFee">
              <UInputNumber
                v-model="state.entryFee"
                :min="0"
                :step="5"
                class="w-42"
                :icon="ICONS.euro"
              />
            </UFormField>
          </div>

          <UFormField :label="$t('tournament.addModal.fields.description')" name="description">
            <UTextarea
              :model-value="state.description ?? ''"
              class="w-full"
              :placeholder="$t('tournament.addModal.fields.descriptionPlaceholder')"
              :icon="ICONS.alignLeft"
              @update:model-value="state.description = ($event as string) || undefined"
            />
          </UFormField>

          <UFormField :label="$t('tournament.addModal.fields.prizes')" name="prizes">
            <UInput
              :model-value="state.prizes ?? ''"
              class="w-full"
              :placeholder="$t('tournament.addModal.fields.prizesPlaceholder')"
              :icon="ICONS.euro"
              @update:model-value="state.prizes = ($event as string) || undefined"
            />
          </UFormField>

          <UFormField :label="$t('tournament.addModal.fields.format')" name="formatUuid">
            <USelectMenu
              v-model="state.formatUuid"
              class="w-full"
              :items="formatOptions"
              value-key="value"
              :placeholder="$t('tournament.addModal.fields.selectFormat')"
              :icon="ICONS.layers"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex justify-between gap-2">
              <UFormField :label="$t('tournament.addModal.fields.startDate')" class="flex-1" name="startDate">
                <UPopover>
                  <UInput
                    :model-value="formattedStartDate"
                    readonly
                    class="w-full"
                    :icon="ICONS.calendar"
                  />

                  <template #content>
                    <UCalendar v-model="startDate" class="p-2" />
                  </template>
                </UPopover>
              </UFormField>

              <UFormField :label="$t('tournament.addModal.fields.startTime')" name="startTime">
                <UTimePicker
                  v-model="state.startTime"
                  :placeholder="$t('tournament.addModal.fields.selectTime')"
                  :minute-step="15"
                />
              </UFormField>
            </div>

            <UFormField :label="$t('tournament.addModal.fields.roundCount')" name="roundCount">
              <UInputNumber
                v-model="state.roundCount"
                :min="1"
                :icon="ICONS.hash"
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="$t('tournament.addModal.fields.organizer')" name="organizerUuid">
              <USelectMenu
                v-model="state.organizerUuid"
                class="w-full"
                :items="organizerOptions"
                value-key="value"
                :placeholder="$t('tournament.addModal.fields.selectOrganizer')"
                :icon="ICONS.player"
              />
            </UFormField>

            <UFormField :label="$t('tournament.addModal.fields.location')" name="locationUuid">
              <USelectMenu
                v-model="state.locationUuid"
                class="w-full"
                :items="locationOptions"
                value-key="value"
                :placeholder="$t('tournament.addModal.fields.selectLocation')"
                :icon="ICONS.mapPin"
              />
            </UFormField>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            :label="$t('tournament.editModal.cancel')"
            color="neutral"
            variant="ghost"
            :disabled="submitting"
            @click="open = false"
          />
          <UButton
            :label="$t('tournament.editModal.save')"
            :icon="ICONS.confirm"
            type="submit"
            :loading="submitting"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
