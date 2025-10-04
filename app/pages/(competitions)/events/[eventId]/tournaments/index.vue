<script lang="ts" setup>
import { sub } from 'date-fns'
import type { Range } from '~/types'

const { breadcrumbItems } = useBreadcrumbs()

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})
</script>

<template>
  <UDashboardPanel id="tournaments">
    <template #header>
      <UDashboardNavbar title="Tournaments">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <TournamentsAddModal />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" class="ms-2" />
        </template>
        <template #right>
          <!-- NOTE: The `-ms-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
          <HomeDateRangePicker v-model="range" class="-ms-1" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <!-- <TournamentsTable :period="period" :range="range" /> -->
      <ul class="list-disc ms-4">
        <li>Elenco di tutti i tornei</li>
        <li>Range di date come filtro</li>
      </ul>
      Filtri:
      <ul class="list-disc ms-4">
        <li>Organizzatori del torneo (aggiungere voce al db)</li>
        <li>Formato del torneo</li>
        <li>Luogo di svolgimento del torneo</li>
      </ul>
      La vista dovrebbe essere una tabella con filtri e paginazione.
      Ogni riga della tabella dovrebbe mostrare:
      <ul class="list-disc ms-4">
        <li>Data del torneo</li>
        <li>Stato del torneo (programmato, in corso, completato, annullato)</li>
        <li>Organizzatore del torneo</li>
        <li>Nome del torneo</li>
        <li>Eventuali collegamenti all'evento associato e alla lega associata</li>
        <li>Formato del torneo</li>
        <li>Numero di partecipanti</li>
        <li>Vincitore del torneo (se disponibile)</li>
        <li>Link ai dettagli del torneo</li>
      </ul>
    </template>
  </UDashboardPanel>
</template>
