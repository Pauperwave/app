<!-- app\pages\(settings)\settings\index.vue -->
<script setup lang="ts">
import * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import { PAYMENT_METHODS } from '#shared/types/transactions'

definePageMeta({ permission: 'access-settings' })

const { t } = useI18n()
const toast = useToast()

useSeoMeta({ title: () => t('settings.layout.links.general') })

// 'manage-membership-fees' (admin), a stricter check than this whole page's
// own 'access-settings' (also admin today, but access-settings only gates
// whether the page is reachable at all — see docs/architecture/permissions.md)
// — an organizer could theoretically reach /settings some other way in the
// future without this section becoming editable.
const { can } = useUserRole()
const { paymentMethodOptions } = useTransactionFormOptions()

const settings = useSettingsQuery()
const { updateMembershipFee, updateTrashRetention } = useSettingsMutations()

const membershipFeeSchema = v.object({
  membershipFeeAmount: v.pipe(
    v.number(t('settings.membershipFee.validation.amountRequired')),
    v.minValue(0.01, t('settings.membershipFee.validation.amountRequired'))
  ),
  membershipFeePaymentMethod: v.picklist(PAYMENT_METHODS, t('settings.membershipFee.validation.paymentMethodRequired'))
})

type MembershipFeeSchema = v.InferOutput<typeof membershipFeeSchema>

const membershipFeeState = reactive<Partial<MembershipFeeSchema>>({
  membershipFeeAmount: undefined,
  membershipFeePaymentMethod: undefined
})

// Fills the form once, the first time the query resolves — not a continuous
// sync (no `immediate`-only guard would do that), which would clobber an
// in-progress edit if settings.data refetches (e.g. window refocus) while
// the admin is mid-edit.
watch(settings.data, (data) => {
  if (!data || membershipFeeState.membershipFeeAmount !== undefined) return
  membershipFeeState.membershipFeeAmount = data.membershipFeeAmount
  membershipFeeState.membershipFeePaymentMethod = data.membershipFeePaymentMethod
}, { immediate: true })

async function onMembershipFeeSubmit(event: FormSubmitEvent<MembershipFeeSchema>) {
  try {
    await updateMembershipFee.mutateAsync(event.data)
    toast.add({
      title: t('settings.membershipFee.successToastTitle'),
      description: t('settings.membershipFee.successToastDescription'),
      color: 'success'
    })
  } catch (err) {
    toast.add({
      title: t('settings.membershipFee.errorToastTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  }
}

// 'purge-trash' (super_admin) — one tier above 'manage-membership-fees'
// above: this value controls when pg_cron's purge_expired_trash() (migration
// 20260823120000) deletes soft-deleted rows for good, same sensitivity as
// the manual purge button on /trash itself.
const trashRetentionSchema = v.object({
  trashRetentionDays: v.pipe(
    v.number(t('settings.trashRetention.validation.daysRequired')),
    v.integer(t('settings.trashRetention.validation.daysRequired')),
    v.minValue(1, t('settings.trashRetention.validation.daysRequired'))
  )
})

type TrashRetentionSchema = v.InferOutput<typeof trashRetentionSchema>

const trashRetentionState = reactive<Partial<TrashRetentionSchema>>({
  trashRetentionDays: undefined
})

watch(settings.data, (data) => {
  if (!data || trashRetentionState.trashRetentionDays !== undefined) return
  trashRetentionState.trashRetentionDays = data.trashRetentionDays
}, { immediate: true })

async function onTrashRetentionSubmit(event: FormSubmitEvent<TrashRetentionSchema>) {
  try {
    await updateTrashRetention.mutateAsync(event.data)
    toast.add({
      title: t('settings.trashRetention.successToastTitle'),
      description: t('settings.trashRetention.successToastDescription'),
      color: 'success'
    })
  } catch (err) {
    toast.add({
      title: t('settings.trashRetention.errorToastTitle'),
      description: toErrorMessage(err),
      color: 'error'
    })
  }
}
</script>

<template>
  <UForm
    v-if="can('manage-membership-fees')"
    id="membership-fee-settings"
    :schema="membershipFeeSchema"
    :state="membershipFeeState"
    class="mb-4 sm:mb-6 lg:mb-12"
    @submit="onMembershipFeeSubmit"
  >
    <UPageCard
      :title="$t('settings.membershipFee.title')"
      :description="$t('settings.membershipFee.description')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        form="membership-fee-settings"
        :label="$t('settings.membershipFee.saveChanges')"
        color="neutral"
        type="submit"
        :loading="updateMembershipFee.isLoading.value"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        name="membershipFeeAmount"
        :label="$t('settings.membershipFee.fields.amount')"
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInputNumber
          v-model="membershipFeeState.membershipFeeAmount"
          :min="0"
          :step="0.5"
          :format-options="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }"
          class="w-48"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="membershipFeePaymentMethod"
        :label="$t('settings.membershipFee.fields.paymentMethod')"
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <USelectMenu
          v-model="membershipFeeState.membershipFeePaymentMethod"
          :items="paymentMethodOptions"
          value-key="value"
          class="w-48"
        />
      </UFormField>
    </UPageCard>
  </UForm>

  <UForm
    v-if="can('purge-trash')"
    id="trash-retention-settings"
    :schema="trashRetentionSchema"
    :state="trashRetentionState"
    class="mb-4 sm:mb-6 lg:mb-12"
    @submit="onTrashRetentionSubmit"
  >
    <UPageCard
      :title="$t('settings.trashRetention.title')"
      :description="$t('settings.trashRetention.description')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        form="trash-retention-settings"
        :label="$t('settings.trashRetention.saveChanges')"
        color="neutral"
        type="submit"
        :loading="updateTrashRetention.isLoading.value"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        name="trashRetentionDays"
        :label="$t('settings.trashRetention.fields.days')"
        :description="$t('settings.trashRetention.fields.daysDescription')"
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInputNumber
          v-model="trashRetentionState.trashRetentionDays"
          :min="1"
          :step="1"
          class="w-48"
        />
      </UFormField>
    </UPageCard>
  </UForm>
</template>
