<!-- app\pages\(settings)\settings\index.vue -->
<script setup lang="ts">
import * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import { PAYMENT_METHODS } from '#shared/types/transactions'

definePageMeta({ permission: 'access-settings' })

const fileRef = ref<HTMLInputElement>()
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
const { updateMembershipFee } = useSettingsMutations()

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

const profileSchema = v.object({
  name: v.pipe(
    v.string(t('settings.general.validation.nameRequired')),
    v.minLength(2, t('settings.general.validation.nameTooShort'))
  ),
  email: v.pipe(
    v.string(t('settings.general.validation.emailRequired')),
    v.email(t('settings.general.validation.invalidEmail'))
  ),
  username: v.pipe(
    v.string(t('settings.general.validation.usernameRequired')),
    v.minLength(2, t('settings.general.validation.usernameTooShort'))
  ),
  avatar: v.optional(v.string()),
  bio: v.optional(v.string())
})

type ProfileSchema = v.InferOutput<typeof profileSchema>

const profile = reactive<Partial<ProfileSchema>>({
  name: 'Emanuele Nardi',
  email: 'emanuele.nardi@pauperwave.com',
  username: 'emanuelenardi',
  avatar: undefined,
  bio: undefined
})
async function onSubmit() {
  toast.add({
    title: t('settings.general.successToastTitle'),
    description: t('settings.general.successToastDescription'),
    icon: ICONS.confirm,
    color: 'success'
  })
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement

  if (!input.files?.length) {
    return
  }

  profile.avatar = URL.createObjectURL(input.files[0]!)
}

function onFileClick() {
  fileRef.value?.click()
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
        />
      </UFormField>
    </UPageCard>
  </UForm>

  <UForm
    id="settings"
    :schema="profileSchema"
    :state="profile"
    @submit="onSubmit"
  >
    <UPageCard
      :title="$t('settings.general.profile.title')"
      :description="$t('settings.general.profile.description')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        form="settings"
        :label="$t('settings.general.profile.saveChanges')"
        color="neutral"
        type="submit"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        name="name"
        :label="$t('settings.general.fields.name')"
        :description="$t('settings.general.fields.nameDescription')"
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="profile.name"
          autocomplete="off"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="email"
        :label="$t('settings.general.fields.email')"
        :description="$t('settings.general.fields.emailDescription')"
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="profile.email"
          type="email"
          autocomplete="off"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="username"
        :label="$t('settings.general.fields.username')"
        :description="$t('settings.general.fields.usernameDescription')"
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="profile.username"
          type="username"
          autocomplete="off"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="avatar"
        :label="$t('settings.general.fields.avatar')"
        :description="$t('settings.general.fields.avatarDescription')"
        class="flex max-sm:flex-col justify-between sm:items-center gap-4"
      >
        <div class="flex flex-wrap items-center gap-3">
          <UAvatar
            :src="profile.avatar"
            :alt="profile.name"
            size="lg"
          />
          <UButton
            :label="$t('settings.general.fields.choose')"
            color="neutral"
            @click="onFileClick"
          />
          <input
            ref="fileRef"
            type="file"
            class="hidden"
            accept=".jpg, .jpeg, .png, .gif"
            @change="onFileChange"
          >
        </div>
      </UFormField>
      <USeparator />
      <UFormField
        name="bio"
        :label="$t('settings.general.fields.bio')"
        :description="$t('settings.general.fields.bioDescription')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
        :ui="{ container: 'w-full' }"
      >
        <UTextarea
          v-model="profile.bio"
          :rows="5"
          autoresize
          class="w-full"
        />
      </UFormField>
    </UPageCard>
  </UForm>
</template>
