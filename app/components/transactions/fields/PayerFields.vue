<!-- app\components\transactions\fields\PayerFields.vue -->
<!--
  Extracted out of AddModal.vue/EditModal.vue (2026-08-16) — the payer
  picker (preset-associate card / associate-search tab / external-payer
  tab), duplicated near-identically between the two but not byte-identical
  (fallow:dupes didn't flag it as a clone: AddModal.vue has UClearButton
  trailing slots and the membership-status alert, EditModal.vue has
  neither). Both differences are preserved here as optional props/slots
  rather than silently unified — `state` is the SAME reactive object the
  parent binds to its own <UForm :state>, mutated directly (same rationale
  as LocationsFields*.vue).

  The uppercase-on-input tax-code transform (payerTaxCodeInput in both
  modals previously) now lives here too, since it only ever wrapped
  state.payer_tax_code — no reason for each modal to redeclare it.
-->
<!-- eslint-disable vue/no-mutating-props -- see the comment above -->
<script setup lang="ts">
import type { Associate } from '~/types'
import type { TransactionFormState } from '~/composables/transactions/useTransactionFormFields'

interface MembershipStatusAlert {
  color?: 'neutral' | 'success' | 'warning' | 'error' | 'primary' | 'secondary' | 'info'
  icon: string
  title: string
}

const {
  state,
  presetAssociate = null,
  associateOptions,
  selectedAssociateAvatar,
  payerTabItems,
  membershipStatusAlert = null,
  showClearButtons = false,
  emailPlaceholder
} = defineProps<{
  state: TransactionFormState
  /** Set when opened from an associate's "Rinnova" action — locks the payer
   *  to that associate instead of showing the tabs (AddModal.vue only). */
  presetAssociate?: Associate | null
  associateOptions: { value: string, label: string }[]
  selectedAssociateAvatar: { src?: string } | undefined
  payerTabItems: { label: string, value: string, slot: string }[]
  /** AddModal.vue only — EditModal.vue never computes this. */
  membershipStatusAlert?: MembershipStatusAlert | null
  /** AddModal.vue shows a clear ("x") button on the external-payer inputs
   *  once they have text, EditModal.vue doesn't — preserved as-is rather
   *  than silently unified. */
  showClearButtons?: boolean
  /** AddModal.vue only — EditModal.vue leaves the email field without one. */
  emailPlaceholder?: string
}>()

const activeTab = defineModel<string>('activeTab', { required: true })

const payerTaxCodeInput = computed({
  get: () => state.payer_tax_code,
  set: (value) => {
    state.payer_tax_code = value?.toUpperCase() || ''
  }
})
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <div v-if="presetAssociate" class="space-y-2">
    <div class="flex items-center gap-2 rounded-md border border-default p-3">
      <UIcon :name="ICONS.playerConfirmed" class="size-5 text-muted shrink-0" />
      <div class="min-w-0">
        <p class="font-medium truncate">
          {{ presetAssociate.first_name }} {{ presetAssociate.last_name }}
        </p>
        <p v-if="presetAssociate.pauperwave_associate_number" class="text-sm text-muted">
          {{ presetAssociate.pauperwave_associate_number }}
        </p>
      </div>
    </div>

    <UAlert
      v-if="membershipStatusAlert"
      variant="subtle"
      v-bind="membershipStatusAlert"
    />
  </div>

  <UTabs v-else v-model="activeTab" :items="payerTabItems">
    <template #associate>
      <div class="mt-2 space-y-2">
        <UFormField
          :label="$t('transaction.addModal.fields.member')"
          name="associate_uuid"
          required
        >
          <USelectMenu
            v-model="state.associate_uuid"
            :items="associateOptions"
            value-key="value"
            :placeholder="$t('transaction.addModal.fields.selectMember')"
            :icon="selectedAssociateAvatar ? undefined : ICONS.player"
            :avatar="selectedAssociateAvatar"
            class="w-full"
          />
        </UFormField>

        <UAlert
          v-if="membershipStatusAlert"
          variant="subtle"
          v-bind="membershipStatusAlert"
        />
      </div>
    </template>

    <template #external>
      <div class="grid grid-cols-2 gap-2 mt-2">
        <UFormField
          :label="$t('transaction.addModal.fields.firstName')"
          name="payer_name"
          required
        >
          <UInput
            v-model="state.payer_name"
            type="text"
            class="w-full"
            color="neutral"
          >
            <template v-if="showClearButtons && state.payer_name?.length" #trailing>
              <UClearButton v-model="state.payer_name" />
            </template>
          </UInput>
        </UFormField>

        <UFormField
          :label="$t('transaction.addModal.fields.lastName')"
          name="payer_surname"
          required
        >
          <UInput
            v-model="state.payer_surname"
            type="text"
            class="w-full"
            color="neutral"
          >
            <template v-if="showClearButtons && state.payer_surname?.length" #trailing>
              <UClearButton v-model="state.payer_surname" />
            </template>
          </UInput>
        </UFormField>

        <UFormField
          :label="$t('transaction.addModal.fields.email')"
          name="payer_email"
          required
        >
          <UInput
            v-model="state.payer_email"
            type="email"
            class="w-full"
            color="neutral"
            :placeholder="emailPlaceholder"
            :icon="ICONS.atSign"
          >
            <template v-if="showClearButtons && state.payer_email?.length" #trailing>
              <UClearButton v-model="state.payer_email" />
            </template>
          </UInput>
        </UFormField>

        <UFormField
          :label="$t('transaction.addModal.fields.taxCode')"
          name="payer_tax_code"
          required
        >
          <UInput
            v-model="payerTaxCodeInput"
            type="text"
            class="w-full"
            color="neutral"
            maxlength="16"
          >
            <template v-if="showClearButtons && state.payer_tax_code?.length" #trailing>
              <UClearButton v-model="state.payer_tax_code" />
            </template>
          </UInput>
        </UFormField>
      </div>
    </template>
  </UTabs>
</template>
