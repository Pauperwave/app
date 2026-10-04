<!-- app\pages\(competitions)\rulesets\index.vue -->
<script lang="ts" setup>
import type { TabsItem } from '@nuxt/ui'

// The route is gated like the sidebar link (manage-rulesets): it used to be nav-hidden only, with
// the route open to any authenticated user (see the permissions.vue table's statusNote)
definePageMeta({ permission: 'manage-rulesets' })

const { t } = useI18n()

useSeoMeta({ title: () => t('ruleset.breadcrumb') })

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
          <RulesetsCittadinoCard v-if="activeTab === 'cittadino'" />
          <RulesetsFormatRulesCard v-else-if="activeTab === 'commander'" format="commander" />
          <RulesetsFormatRulesCard v-else-if="activeTab === 'premodern'" format="premodern" />
          <RulesetsFormatRulesCard v-else-if="activeTab === 'pauper'" format="pauper" />
          <RulesetsDraftCard v-else-if="activeTab === 'draft'" />
          <RulesetsSealedCard v-else-if="activeTab === 'sealed'" />
          <RulesetsManageCard v-else-if="activeTab === 'manage'" />
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <TourGuide :tour="tour" />
</template>
