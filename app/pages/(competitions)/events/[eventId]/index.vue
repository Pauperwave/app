<script lang="ts" setup>
const { breadcrumbItems } = useBreadcrumbs()
</script>

<template>
  <UDashboardPanel id="event">
    <template #header>
      <UDashboardNavbar title="Evento">
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

    <template #body>
      Evento specifico

      Contiene i dettagli dell'evento selezionato

      Lista dei partecipanti all'evento

      Elenco dei tornei associati all'evento
    </template>
  </UDashboardPanel>
</template>
