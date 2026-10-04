<!-- app\components\rulesets\ManageCard.vue -->
<!-- Ruleset management: a "Gestione" tab beside the published-format ones, a different kind of
     content (a CRUD list, not published regulation text) but ruleset-related, so it stays on the
     rulesets page rather than /settings. -->
<script lang="ts" setup>
import type { RulesetWithPoints } from '~/composables/rulesets/useRulesetsWithPointsQuery'

const { can } = useUserRole()

const { data: rulesetsData, isLoading: rulesetsLoading } = useRulesetsWithPointsQuery()
const { deleteRuleset } = useRulesetsMutations()

const formModalOpen = ref(false)
const editingRuleset = ref<RulesetWithPoints | null>(null)

function openCreateModal() {
  editingRuleset.value = null
  formModalOpen.value = true
}
function openEditModal(ruleset: RulesetWithPoints) {
  editingRuleset.value = ruleset
  formModalOpen.value = true
}

const deleteConfirmOpen = ref(false)
const rulesetToDelete = ref<RulesetWithPoints | null>(null)
function requestDelete(ruleset: RulesetWithPoints) {
  rulesetToDelete.value = ruleset
  deleteConfirmOpen.value = true
}
function confirmDelete() {
  if (!rulesetToDelete.value) return
  deleteRuleset.mutate({ rulesetUuid: rulesetToDelete.value.uuid })
  deleteConfirmOpen.value = false
}
</script>

<template>
  <UPageCard
    :title="$t('ruleset.manage.title')"
    :description="$t('ruleset.manage.description')"
    :icon="ICONS.settingsGear"
  >
    <div class="flex flex-col gap-4">
      <AddButton
        v-if="can('manage-rulesets')"
        :label="$t('ruleset.manage.addButton')"
        :icon="ICONS.add"
        @click="openCreateModal"
      />

      <ListSkeleton v-if="rulesetsLoading" :columns="4" />

      <EmptyState
        v-else-if="!rulesetsData?.length"
        :message="$t('ruleset.manage.empty')"
      />

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <UCard v-for="ruleset in rulesetsData" :key="ruleset.uuid">
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="font-semibold">{{ ruleset.name }}</span>
                <UBadge
                  v-if="ruleset.isDefault"
                  size="xs"
                  color="primary"
                  variant="subtle"
                >
                  {{ $t('ruleset.manage.defaultBadge') }}
                </UBadge>
              </div>
              <div class="flex gap-1">
                <EditIconButton
                  :label="$t('ruleset.manage.editTitle')"
                  size="xs"
                  @click="openEditModal(ruleset)"
                />
                <UButton
                  v-if="can('delete-ruleset')"
                  :icon="ICONS.delete"
                  size="xs"
                  color="error"
                  variant="ghost"
                  @click="requestDelete(ruleset)"
                />
              </div>
            </div>
          </template>

          <div class="flex flex-wrap gap-1.5 text-xs text-muted">
            <span>{{ $t('ruleset.actions.kill') }}: {{ ruleset.kill }}</span>
            <span>·</span>
            <span>{{ $t('ruleset.actions.brew') }}: {{ ruleset.brew }}</span>
            <span>·</span>
            <span>{{ $t('ruleset.actions.play') }}: {{ ruleset.play }}</span>
            <span>·</span>
            <span>
              {{ $t('ruleset.actions.participation') }}: {{ ruleset.participation }}
            </span>
            <span>·</span>
            <span>1°-4°: {{
              [ruleset.rank1, ruleset.rank2, ruleset.rank3, ruleset.rank4].join('/')
            }}</span>
          </div>
        </UCard>
      </div>
    </div>
  </UPageCard>

  <RulesetsRulesetFormModal v-model:open="formModalOpen" :ruleset="editingRuleset" />

  <ConfirmModal
    v-model:open="deleteConfirmOpen"
    :title="$t('ruleset.manage.deleteConfirmTitle')"
    :description="$t('ruleset.manage.deleteConfirmDescription')"
    :question="$t('ruleset.manage.deleteConfirmQuestion')"
    :subject="rulesetToDelete?.name"
    :warning="$t('ruleset.manage.deleteConfirmWarning')"
    :loading="deleteRuleset.isLoading.value"
    @confirm="confirmDelete"
  />
</template>
