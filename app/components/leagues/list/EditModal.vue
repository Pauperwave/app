<!-- app\components\leagues\list\EditModal.vue -->
<script setup lang="ts">
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
// tournaments/list/EditModal.vue's own state literal. No startDate here
// (2026-08-16 ADR, docs/PROGRESS.md): a league's dates are derived from its
// tournaments, not user-editable.
const state = reactive<LeagueFormState>({
  name: undefined,
  status: 'draft',
  rulesetUuid: undefined
})

// Kept out of `state`/the valibot schema (no format validation needed) —
// same convention as TournamentsListEditModal.vue's `image`. imageCardName/
// imageCardArtist ride along for the same reason — see CardArtPicker.vue.
const image = ref<string | undefined>(undefined)
const imageCardName = ref<string | undefined>(undefined)
const imageCardArtist = ref<string | undefined>(undefined)

// Refills every time the modal opens on a (possibly new) league — same
// convention as TournamentsListEditModal.vue's watch on its `tournament` prop.
watch([open, () => league], ([isOpen, current]) => {
  if (!isOpen || !current) return

  state.name = current.name
  state.status = current.status
  state.rulesetUuid = current.rulesetUuid ?? undefined
  image.value = current.image ?? undefined
  imageCardName.value = current.imageCardName ?? undefined
  imageCardArtist.value = current.imageCardArtist ?? undefined
}, { immediate: true })

const { schema, statusOptions, rulesetOptions } = useLeagueFormFields()

type Schema = v.InferOutput<typeof schema>

const submitting = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!league) return

  const payload: NewLeaguePayload = {
    name: event.data.name,
    status: event.data.status,
    rulesetUuid: event.data.rulesetUuid || null,
    imageUrl: image.value ?? null,
    imageCardName: imageCardName.value ?? null,
    imageCardArtist: imageCardArtist.value ?? null
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
          v-model:image="image"
          v-model:image-card-name="imageCardName"
          v-model:image-card-artist="imageCardArtist"
          :state="state"
          :status-options="statusOptions"
          :ruleset-options="rulesetOptions"
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
