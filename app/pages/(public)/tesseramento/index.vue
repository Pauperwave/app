<!-- app\pages\(public)\tesseramento\index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'public' })

const { t } = useI18n()

useSeoMeta({
  title: t('tesseramento.seoTitle'),
  description: t('tesseramento.seoDescription'),
  robots: 'noindex, nofollow'
})

const form = useTemplateRef('form')

const {
  schema,
  state,
  steps,
  currentStep,
  stepIndex,
  kind,
  renewalName,
  submitted,
  sendingOtp,
  confirmingRenewal,
  submitting,
  sendOtp,
  confirmRenewal,
  goNext,
  goBack,
  onSubmit
} = useTesseramentoFlow(form)

const associateTypeOptions = useAssociateTypeOptions()
</script>

<template>
  <UPageCard v-if="submitted" :title="$t('tesseramento.successTitle')">
    <p class="text-muted">
      {{ $t('tesseramento.successDescription') }}
    </p>
  </UPageCard>

  <UPageCard v-else-if="kind === 'renewal'" :title="$t('tesseramento.renewal.title')">
    <TesseramentoRenewalStep
      :first-name="renewalName.firstName"
      :last-name="renewalName.lastName"
      :confirming="confirmingRenewal"
      @confirm="confirmRenewal"
    />
  </UPageCard>

  <UPageCard v-else-if="kind === 'blocked'" :title="$t('tesseramento.blockedTitle')">
    <p class="text-muted">
      {{ $t('tesseramento.blockedDescription') }}
    </p>
  </UPageCard>

  <UPageCard v-else :title="$t('tesseramento.title')">
    <!-- disabled: a purely visual progress indicator: even with `linear`, Reka UI's Stepper
         lets a click jump forward one step or back to any completed one, bypassing goNext()'s
         per-step validation. Navigation is only driven by currentStep from the Avanti/Indietro
         buttons. title hidden (sr-only, not removed: screen readers still get it): 9 steps'
         Italian titles don't fit side by side at this page's width (max-w-2xl) without
         overlapping. The step text moves to a plain "Passo X di Y — Title" line below, like the
         guided tour's stepIndicator -->
    <UStepper
      v-model="currentStep"
      disabled
      :items="steps"
      size="sm"
      class="mb-2"
      :ui="{ title: 'sr-only' }"
    />
    <p class="text-base font-medium text-highlighted mb-4">
      {{ $t('tesseramento.stepIndicator', {
        current: stepIndex + 1, total: steps.length, title: steps[stepIndex]?.title
      }) }}
    </p>

    <UForm
      ref="form"
      :schema="schema"
      :state="state"
      class="space-y-4"
    >
      <TesseramentoEmailStep
        v-if="currentStep === 'email'"
        :state="state"
        :sending-otp="sendingOtp"
        @send-otp="sendOtp"
      />

      <TesseramentoVerifyStep
        v-else-if="currentStep === 'verify'"
        :email="state.email_address"
        :sending-otp="sendingOtp"
        @resend="sendOtp"
        @back="goBack"
      />

      <template v-else>
        <template v-if="currentStep === 'associateType'">
          <UFormField :label="$t('associate.addModal.fields.associateType')" name="associate_type">
            <USelect
              v-model="state.associate_type"
              :items="associateTypeOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>
        </template>

        <template v-else-if="currentStep === 'birthInfo'">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <AssociatesFieldsBirthInfoFields :state="state" />
          </div>
        </template>

        <template v-else-if="currentStep === 'personalInfo'">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <AssociatesFieldsPersonalInfoFields :state="state" />
            <UFormField :label="$t('associate.addModal.fields.email')" name="email_address_display">
              <UInput
                :model-value="state.email_address"
                disabled
                class="w-full"
              />
            </UFormField>
          </div>
        </template>

        <template v-else-if="currentStep === 'fiscalInfo'">
          <AssociatesFieldsTaxCodeField :state="state" />
        </template>

        <template v-else-if="currentStep === 'residencyInfo'">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <AssociatesFieldsResidencyFields :state="state" />
          </div>
        </template>

        <TesseramentoConsentsStep v-else-if="currentStep === 'consents'" :state="state" />

        <div class="flex justify-between gap-2 pt-2">
          <UButton
            v-if="stepIndex > 0"
            :label="$t('tesseramento.back')"
            color="neutral"
            variant="subtle"
            @click="goBack"
          />
          <div v-else />

          <div class="flex gap-2">
            <UButton
              v-if="currentStep !== 'consents'"
              :label="$t('tesseramento.next')"
              color="primary"
              @click="goNext"
            />
            <UButton
              v-else
              :label="$t('tesseramento.steps.consents.submit')"
              color="primary"
              :loading="submitting"
              @click="onSubmit"
            />
          </div>
        </div>
      </template>
    </UForm>
  </UPageCard>
</template>
