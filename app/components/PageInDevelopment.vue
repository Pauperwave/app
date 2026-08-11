<!-- app\components\PageInDevelopment.vue -->
<!-- Shared by /calendar and /finance — same placeholder shell, byte-identical
     except for the panel id and title (fallow dupes, 2026-08-12). Give this a
     real body once either page's feature actually starts. -->
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
          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="text-center py-12 text-muted">
        {{ $t('common.pageInDevelopment') }}
      </div>
    </template>
  </UDashboardPanel>
</template>
