<script lang="ts" setup>
const { breadcrumbItems } = useBreadcrumbs()
</script>

<template>
  <UDashboardPanel id="statistics">
    <template #header>
      <UDashboardNavbar title="Statistics">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" class="ms-2" />
        </template>
      </UDashboardToolbar>
    </template>
  </UDashboardPanel>
</template>
