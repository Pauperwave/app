<!-- app\pages\(competitions)\rulesets\index.vue -->
<script lang="ts" setup>
import type { TabsItem } from '@nuxt/ui'
import type { RulesetWithPoints } from '~/composables/rulesets/useRulesetsWithPointsQuery'

// Was nav-hidden only (sidebar gated on manage-rulesets, the route itself
// wide open to any authenticated user) — closed 2026-08-29, see the
// permissions.vue table's own statusNote on why this was flagged.
definePageMeta({ permission: 'manage-rulesets' })

const { t } = useI18n()
const { can } = useUserRole()

useSeoMeta({ title: () => t('ruleset.breadcrumb') })

// Ruleset management (user request, 2026-09-17): a "Gestione" tab alongside
// the published-format tabs above — different kind of content (a CRUD data
// table, not published regulation text) but genuinely ruleset-related, so it
// stays on this page rather than moving to /settings.
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

// Rules are rendered from the same constants the standings are scored with, so
// the published regulation cannot drift from what /standings/cittadino actually
// computes.
const pointRows = computed(() => [
  ...CITTADINO_POINTS_BY_RANK.map((points, index) => ({
    place: `${index + 1}°`,
    points
  })),
  {
    place: `${CITTADINO_POINTS_BY_RANK.length + 1}°+`,
    points: CITTADINO_MIN_POINTS
  }
])

// No `slot` per item: with :content="false" below, UTabs renders only the
// trigger strip — the panel for the active tab is rendered separately in #body,
// same split as /standings/cittadino's edition tabs.
const tabs = computed<TabsItem[]>(() => [
  { label: t('ruleset.tabs.cittadino'), value: 'cittadino' },
  { label: t('ruleset.tabs.commander'), value: 'commander' },
  { label: t('ruleset.tabs.premodern'), value: 'premodern' },
  { label: t('ruleset.tabs.pauper'), value: 'pauper' },
  { label: t('ruleset.tabs.draft'), value: 'draft' },
  { label: t('ruleset.tabs.sealed'), value: 'sealed' },
  { label: t('ruleset.tabs.manage'), value: 'manage' }
])

const activeTab = ref('cittadino')

const tour = useRulesetsTour()
</script>

<template>
  <UDashboardPanel id="rulesets">
    <template #header>
      <UDashboardNavbar :title="$t('ruleset.breadcrumb')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <TourStartButton :label="$t('ruleset.tour.startButton')" @start="tour.start()" />

          <USeparator orientation="vertical" class="h-4" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-6">
        <div id="tour-rulesets-tabs" class="w-fit">
          <UTabs
            v-model="activeTab"
            :items="tabs"
            variant="link"
            class="w-full"
            :content="false"
          />
        </div>

        <div id="tour-rulesets-content">
          <UPageCard
            v-if="activeTab === 'cittadino'"
            :title="$t('ruleset.cittadino.title')"
            :description="$t('ruleset.cittadino.description')"
            :icon="ICONS.medal"
          >
            <div class="flex flex-col gap-6">
              <div>
                <p class="mb-2 text-sm font-medium text-highlighted">
                  {{ $t('ruleset.cittadino.pointsTitle') }}
                </p>

                <div class="flex flex-wrap gap-1.5">
                  <div
                    v-for="row in pointRows"
                    :key="row.place"
                    class="flex flex-col items-center rounded-lg border border-default px-3 py-1.5"
                  >
                    <span class="text-xs text-muted">{{ row.place }}</span>
                    <span class="text-sm font-semibold text-highlighted tabular-nums">
                      {{ row.points }}
                    </span>
                  </div>
                </div>
              </div>

              <USeparator />

              <ul class="flex flex-col gap-3 text-sm text-muted">
                <li class="flex gap-2">
                  <UIcon :name="ICONS.total" class="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    {{ $t('ruleset.cittadino.bestResults', {
                      counted: CITTADINO_COUNTED_RESULTS
                    }) }}
                  </span>
                </li>
                <li class="flex gap-2">
                  <UIcon :name="ICONS.compareArrows" class="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{{ $t('ruleset.cittadino.tieBreak') }}</span>
                </li>
                <li class="flex gap-2">
                  <UIcon :name="ICONS.standings" class="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    {{ $t('ruleset.cittadino.finalists', { finalists: CITTADINO_FINALISTS }) }}
                  </span>
                </li>
                <li class="flex gap-2">
                  <UIcon :name="ICONS.calendarCheck" class="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{{ $t('ruleset.cittadino.eligibility') }}</span>
                </li>
                <li class="flex gap-2">
                  <UIcon :name="ICONS.megaphone" class="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{{ $t('ruleset.cittadino.publication') }}</span>
                </li>
              </ul>

              <USeparator />

              <p class="text-xs text-muted">
                {{ $t('ruleset.cittadino.legend') }}
              </p>
            </div>
          </UPageCard>

          <RulesetsFormatRulesCard v-else-if="activeTab === 'commander'" format="commander" />
          <RulesetsFormatRulesCard v-else-if="activeTab === 'premodern'" format="premodern" />
          <RulesetsFormatRulesCard v-else-if="activeTab === 'pauper'" format="pauper" />

          <!-- Draft/Sealed have no points-based championship (only
               Cittadino/Commander/Premodern/Pauper do, via
               RulesetsFormatRulesCard), so they don't share that component
               — Draft gets its own lighter structure-only card, Sealed a
               plain placeholder until its own rules exist (user request,
               2026-08-23). -->
          <UPageCard
            v-else-if="activeTab === 'draft'"
            :title="$t('ruleset.draft.title')"
            :description="$t('ruleset.draft.description')"
            :icon="ICONS.gameplay"
          >
            <div class="flex flex-col gap-6">
              <div>
                <p class="mb-1 text-sm font-medium text-highlighted">
                  {{ $t('ruleset.draft.structureTitle') }}
                </p>
                <p class="text-sm text-muted">
                  {{ $t('ruleset.draft.structure') }}
                </p>
              </div>

              <USeparator />

              <ul class="flex flex-col gap-3 text-sm text-muted">
                <li class="flex gap-2">
                  <UIcon :name="ICONS.package" class="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{{ $t('ruleset.draft.boosters') }}</span>
                </li>
                <li class="flex gap-2">
                  <UIcon :name="ICONS.players" class="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{{ $t('ruleset.draft.pods') }}</span>
                </li>
              </ul>
            </div>
          </UPageCard>

          <UPageCard
            v-else-if="activeTab === 'sealed'"
            :title="$t('ruleset.sealed.title')"
            :description="$t('ruleset.sealed.description')"
            :icon="ICONS.gameplay"
          >
            <UAlert
              color="warning"
              variant="subtle"
              :icon="ICONS.warning"
              :description="$t('ruleset.sealed.placeholderNotice')"
            />
          </UPageCard>

          <UPageCard
            v-else-if="activeTab === 'manage'"
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
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <TourGuide :tour="tour" />

  <RulesetsFormModal v-model:open="formModalOpen" :ruleset="editingRuleset" />

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
