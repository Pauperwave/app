<!-- app\components\associates\single\TransactionsCard.vue -->
<script setup lang="ts">
const { associateUuid } = defineProps<{ associateUuid: string }>()

// Filtered client-side out of the cached query /transactions uses: no per-associate endpoint, as
// the whole table is already fetched and small (like useAssociatesTableColumns.ts resolving
// updated_by/created_by client-side)
const {
  data: transactions,
  isLoading: transactionsLoading,
  isPending: transactionsPending
} = useTransactionsQuery()
const associateTransactions = computed(() => (transactions.value ?? [])
  .filter(transaction => transaction.associate?.uuid === associateUuid))

const tournamentsByUuid = useTournamentsByUuid()

// Read-only summary, not the full /transactions table columns (useTransactionsTableColumns.ts): no
// selection/grouping/row-actions, as this is a per-associate history in a bigger detail page, not a
// management surface
const { columns } = useAssociateTransactionsTableColumns(tournamentsByUuid, AMOUNT_FORMATTER)
</script>

<template>
  <UCard :ui="{ header: 'font-semibold' }">
    <template #header>
      {{ $t('associate.detail.sections.transactions') }}
    </template>

    <ListSkeleton v-if="transactionsPending" :columns="columns.length" />
    <p v-else-if="!associateTransactions.length" class="text-sm text-muted py-4 text-center">
      {{ $t('associate.detail.transactionsEmpty') }}
    </p>
    <UTable
      v-else
      :data="associateTransactions"
      :columns="columns"
      :loading="transactionsLoading"
    />
  </UCard>
</template>
