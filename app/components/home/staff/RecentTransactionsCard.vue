<!-- app\components\home\staff\RecentTransactionsCard.vue -->
<!-- Split out of home/Staff.vue (2026-08-29, fallow:health) — see
     PendingActionsCard.vue's own comment. -->
<script setup lang="ts">
import type { Transaction } from '~/types'

defineProps<{ transactions: Transaction[] }>()

const amountFormatter = AMOUNT_FORMATTER
</script>

<template>
  <UPageCard
    id="tour-home-recent-transactions"
    :title="$t('home.staff.recentTransactions.title')"
    variant="subtle"
  >
    <div v-if="!transactions.length" class="text-sm text-muted py-4 text-center">
      {{ $t('home.staff.recentTransactions.empty') }}
    </div>

    <div v-else class="flex flex-col divide-y divide-default">
      <NuxtLink
        v-for="transaction in transactions"
        :key="transaction.id"
        to="/transactions"
        class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:text-highlighted"
      >
        <AssociateTag
          :name="transactionPayerName(transaction)"
          :associate-uuid="transaction.associate?.uuid"
        />
        <div class="flex items-center gap-2 shrink-0">
          <PaymentTypeBadge :type="transaction.payment_type" />
          <span class="text-sm font-medium">
            {{ amountFormatter.format(transaction.payment_amount) }}
          </span>
        </div>
      </NuxtLink>
    </div>
  </UPageCard>
</template>
