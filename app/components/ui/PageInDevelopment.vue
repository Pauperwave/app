<!-- app\components\ui\PageInDevelopment.vue -->
<!-- Shared by /calendar and /finance: the same placeholder shell, identical except for the
     panel id, title and the optional #actions slot. Give it a real body once either page's
     feature starts -->
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
          <!-- Empty by default (e.g. /finance); /calendar uses it for its link to the public
               /eventi calendar, with the copy/open-link pattern of FormatPage.vue /
               associates/requests.vue -->
          <slot name="actions" />

          <NotificationsBellButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <slot name="body">
        <EmptyState
          :message="$t('common.pageInDevelopment')"
        />
      </slot>
    </template>
  </UDashboardPanel>
</template>
