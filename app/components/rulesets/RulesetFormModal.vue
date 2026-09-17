<!-- app\components\rulesets\RulesetFormModal.vue -->
<!-- Create/edit modal for scoring rulesets, restored from league's
     RulesetFormModal.vue (user request, 2026-09-17) — this app's schema
     normalizes point values into ruleset__points category rows instead of
     league's flat rule_set_* columns, and adds a "participation" category
     league never had (seeded but unused by scoring today, see
     useCommanderScoring.ts). -->
<script setup lang="ts">
import * as v from 'valibot'
import type { RulesetWithPoints } from '~/composables/rulesets/useRulesetsWithPointsQuery'

const open = defineModel<boolean>({ default: false })
const { ruleset } = defineProps<{ ruleset: RulesetWithPoints | null }>()

const { t } = useI18n()
const { createRuleset, updateRuleset } = useRulesetsMutations()

const isEditing = computed(() => !!ruleset)

const schema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1))
})
type Schema = v.InferOutput<typeof schema>

function defaultForm(): Record<string, number | undefined> {
  return {
    kill: undefined,
    brew: undefined,
    play: undefined,
    participation: undefined,
    rank1: undefined,
    rank2: undefined,
    rank3: undefined,
    rank4: undefined
  }
}

const state = reactive<Schema>({ name: '' })
const points = reactive(defaultForm())

watch(open, (isOpen) => {
  if (!isOpen) return
  if (ruleset) {
    state.name = ruleset.name
    Object.assign(points, {
      kill: ruleset.kill,
      brew: ruleset.brew,
      play: ruleset.play,
      participation: ruleset.participation,
      rank1: ruleset.rank1,
      rank2: ruleset.rank2,
      rank3: ruleset.rank3,
      rank4: ruleset.rank4
    })
  } else {
    state.name = ''
    Object.assign(points, defaultForm())
  }
})

function updateField(key: string, value: number | undefined) {
  points[key] = value
}

const gameActionFields = [
  { key: 'kill', label: t('ruleset.actions.kill'), icon: ICONS.kills },
  { key: 'brew', label: t('ruleset.actions.brew'), icon: ICONS.brewVotes },
  { key: 'play', label: t('ruleset.actions.play'), icon: ICONS.playVotes },
  { key: 'participation', label: t('ruleset.actions.participation'), icon: ICONS.playerConfirmed }
] as const

const rankFields = [
  { key: 'rank1', label: '1°', icon: ICONS.medal },
  { key: 'rank2', label: '2°', icon: ICONS.medal },
  { key: 'rank3', label: '3°', icon: ICONS.medal },
  { key: 'rank4', label: '4°', icon: ICONS.medal }
] as const

const canSubmit = computed(() => {
  if (!state.name.trim()) return false
  return Object.values(points).every(v => v !== undefined)
})

async function onSubmit() {
  if (!canSubmit.value) return

  const payload = {
    name: state.name.trim(),
    points: {
      kill: points.kill ?? 0,
      brew: points.brew ?? 0,
      play: points.play ?? 0,
      participation: points.participation ?? 0,
      rank1: points.rank1 ?? 0,
      rank2: points.rank2 ?? 0,
      rank3: points.rank3 ?? 0,
      rank4: points.rank4 ?? 0
    }
  }

  try {
    if (isEditing.value && ruleset) {
      await updateRuleset.mutateAsync({ rulesetUuid: ruleset.uuid, ...payload })
    } else {
      await createRuleset.mutateAsync(payload)
    }
    open.value = false
  } catch {
    // useRulesetsMutations already toasts the error
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'max-w-lg' }"
    :title="isEditing ? t('ruleset.manage.editTitle') : t('ruleset.manage.createTitle')"
    :description="isEditing
      ? t('ruleset.manage.editDescription')
      : t('ruleset.manage.createDescription')"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          :label="t('ruleset.form.nameLabel')"
          name="name"
          required
        >
          <UInput v-model="state.name" class="w-full" />
        </UFormField>

        <RulesetsFieldGrid
          :heading-icon="ICONS.battle"
          :heading-text="t('ruleset.form.gameActionsHeading')"
          :items="gameActionFields"
          :form="points"
          @update-field="updateField"
        />

        <RulesetsFieldGrid
          :heading-icon="ICONS.standings"
          :heading-text="t('ruleset.form.positionsHeading')"
          :items="rankFields"
          :form="points"
          @update-field="updateField"
        />

        <div class="flex justify-end gap-2">
          <UButton
            :label="t('ruleset.manage.cancel')"
            color="neutral"
            variant="ghost"
            @click="open = false"
          />
          <UButton
            :label="isEditing ? t('ruleset.manage.save') : t('ruleset.manage.create')"
            :icon="ICONS.confirm"
            type="submit"
            :disabled="!canSubmit"
            :loading="createRuleset.isLoading.value || updateRuleset.isLoading.value"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
