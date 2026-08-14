<!-- app\components\PageInDevelopment.vue -->
<!-- Shared by /calendar and /finance — same placeholder shell, byte-identical
     except for the panel id, title, and the optional #actions slot
     (fallow dupes, 2026-08-12). Give this a real body once either page's
     feature actually starts. -->
<script setup lang="ts">
interface Props {
  panelId: string
  title: string
}

const { panelId, title } = defineProps<Props>()
</script>

<template>
  <UDashboardPanel :id="panelId">
    <template #header>
      <UDashboardNavbar :title="title">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <!-- Empty by default (e.g. /finance) — /calendar uses this for its
               link to the public /eventi calendar, same copy/open-link
               pattern as FormatPage.vue / associates/requests.vue. -->
          <slot name="actions" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <slot name="body">
        <div class="text-center py-12 text-muted">
          {{ $t('common.pageInDevelopment') }}
        </div>
      </slot>
    </template>
  </UDashboardPanel>
</template>
