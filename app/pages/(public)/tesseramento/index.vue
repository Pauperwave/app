<!-- app\pages\(public)\tesseramento\index.vue -->
<script setup lang="ts">
import * as v from 'valibot'
import { format } from 'date-fns'

definePageMeta({ layout: 'public' })

const { t } = useI18n()

useSeoMeta({
  title: t('tesseramento.seoTitle'),
  description: t('tesseramento.seoDescription'),
  robots: 'noindex, nofollow'
})

const supabase = useSupabaseClient()
const session = useSupabaseSession()
// useSupabaseSession()'s Session type deliberately omits `.user` — the email
// has to come from useSupabaseUser() instead, populated async from
// auth.getClaims() (see auth/callback.vue's comment on the same caveat), so
// it can resolve a beat after `session` does.
const authUser = useSupabaseUser()
const toast = useToast()

// Same shape as associates/list/AddModal.vue, sharing associateFormSchema —
// see that file's schema comment for why v.string(msg) is used even where a
// v.pipe() constraint also has one.
const schema = associateFormObjectSchema(t)
type Schema = v.InferOutput<typeof schema>

const state = createAssociateFormState()

const associateTypeOptions = useAssociateTypeOptions()

// Each step's field names, used to validate only that step on "Avanti" —
// UForm's validate({ name: [...] }) checks named fields regardless of
// whether they're currently rendered, so this works even though every other
// step's UFormFields are v-if'd out at the time.
const steps = [
  { value: 'email', title: t('tesseramento.steps.email.title'), fields: [] },
  { value: 'verify', title: t('tesseramento.steps.verify.title'), fields: [] },
  { value: 'associateType', title: t('associate.addModal.sections.associateType'), fields: ['associate_type'] },
  {
    value: 'birthInfo',
    title: t('associate.addModal.sections.birthInfo'),
    fields: ['born_location', 'born_date', 'born_province', 'born_state']
  },
  // After birthInfo, not before (2026-08-19): phone_number's required-ness
  // depends on born_date (isMinor.ts — a minor may not have their own phone)
  // — asking birth date first means that cross-field rule can actually apply
  // when this step's "Avanti" validates phone_number, instead of always
  // skipping it (born_date not yet known) and only catching a missing phone
  // at the very final submit, on a step where the field isn't even visible.
  {
    value: 'personalInfo',
    title: t('associate.addModal.sections.personalInfo'),
    fields: ['first_name', 'last_name', 'phone_number']
  },
  { value: 'fiscalInfo', title: t('associate.addModal.sections.fiscalInfo'), fields: ['tax_code'] },
  {
    value: 'residencyInfo',
    title: t('associate.addModal.sections.residencyInfo'),
    fields: ['residency_address', 'residency_house_number', 'residency_city', 'residency_province', 'residency_cap']
  },
  {
    value: 'consents',
    title: t('associate.addModal.sections.consents'),
    fields: ['consent_data', 'consent_social', 'has_read_statute']
  }
] satisfies { value: string, title: string, fields: (keyof Schema)[] }[]

const currentStep = ref('email')
const stepIndex = computed(() => steps.findIndex(s => s.value === currentStep.value))

// Once the email's verified, checks whether this is a brand-new applicant
// or an already-approved associate renewing — apply.post.ts's insert-only
// contract otherwise 409s any existing row regardless of status, which used
// to be the only signal a returning member got back, after filling out the
// whole 9-step form again (user request, 2026-08-27). 'renewal'/'blocked'
// short-circuit past the step wizard entirely (see template); 'new' behaves
// exactly as before.
type TesseramentoKind = 'new' | 'renewal' | 'blocked'
const checkingStatus = ref(false)
const kind = ref<TesseramentoKind>('new')
const renewalName = ref({ firstName: '', lastName: '' })

// A session already existing on load (back from the magic-link redirect, or
// a page refresh mid-flow) skips straight past email/verify — email is
// already proven at that point. state.email_address is only in-memory,
// though: the redirect through /auth/callback remounts this page fresh,
// wiping it back to '' — recovered here from authUser (the actual source of
// truth for "which email got verified"), not from local state that doesn't
// survive the round trip. Watches both session and authUser (not just
// session) since authUser can resolve a beat later — ||= so it's never
// overwritten once set, from whichever of the two settles it first.
watch([session, authUser], async ([sessionValue, user]) => {
  if (!sessionValue) return
  if (user?.email) state.email_address ||= user.email
  if (currentStep.value !== 'email' && currentStep.value !== 'verify') return

  checkingStatus.value = true
  try {
    const status = await $fetch('/api/associates/tesseramento-status')
    kind.value = status.kind
    if (status.kind === 'renewal') {
      renewalName.value = { firstName: status.firstName, lastName: status.lastName }
    }
  } finally {
    checkingStatus.value = false
  }

  if (kind.value === 'new') currentStep.value = 'associateType'
}, { immediate: true })

const confirmingRenewal = ref(false)
async function confirmRenewal() {
  confirmingRenewal.value = true
  try {
    await $fetch('/api/associates/renew', { method: 'POST' })
    submitted.value = true
  } catch (err) {
    toast.add({
      title: t('tesseramento.errorTitle'),
      description: t('tesseramento.errorGenericDescription', { message: toErrorMessage(err) }),
      color: 'error'
    })
  } finally {
    confirmingRenewal.value = false
  }
}

const form = useTemplateRef('form')

const emailSchema = v.pipe(
  v.string(t('login.emailRequired')),
  v.trim(),
  v.email(t('associate.addModal.validation.invalidEmail')),
  v.toLowerCase()
)

const sendingOtp = ref(false)

async function sendOtp() {
  const result = v.safeParse(emailSchema, state.email_address)
  if (!result.success) {
    form.value?.setErrors([{ name: 'email_address', message: result.issues[0]!.message }])
    return
  }
  state.email_address = result.output

  sendingOtp.value = true
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: result.output,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/tesseramento`
      }
    })

    if (error) {
      toast.add({
        title: t('tesseramento.steps.email.errorTitle'),
        description: error.message,
        color: 'error'
      })
      return
    }

    toast.add({
      title: t('tesseramento.steps.email.linkSentTitle'),
      description: t('tesseramento.steps.email.linkSentDescription'),
      color: 'primary'
    })
    currentStep.value = 'verify'
  } finally {
    sendingOtp.value = false
  }
}

async function goNext() {
  const step = steps[stepIndex.value]
  if (!step) return

  if (step.fields.length) {
    const result = await form.value?.validate({ name: step.fields, silent: true })
    if (!result) return
  }

  const next = steps[stepIndex.value + 1]
  if (next) currentStep.value = next.value
}

function goBack() {
  const prev = steps[stepIndex.value - 1]
  if (prev) currentStep.value = prev.value
}

const submitting = ref(false)
const submitted = ref(false)

async function onSubmit() {
  const result = await form.value?.validate({ silent: true })
  if (!result) return

  submitting.value = true
  try {
    await $fetch('/api/associates/apply', {
      method: 'POST',
      body: {
        ...result,
        born_date: format(result.born_date, 'yyyy-MM-dd')
      }
    })
    submitted.value = true
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode
    toast.add({
      title: t('tesseramento.errorTitle'),
      description: statusCode === 409
        ? t('tesseramento.errorDuplicateDescription')
        : t('tesseramento.errorGenericDescription', { message: toErrorMessage(err) }),
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}
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
    <!-- disabled: purely a visual progress indicator — even with `linear`, Reka
         UI's Stepper still lets a click jump forward one step or back to any
         completed one, bypassing goNext()'s per-step validation. Navigation is
         only ever driven by currentStep from the Avanti/Indietro buttons.
         title hidden (sr-only, not removed — screen readers still get it):
         9 steps' Italian titles don't fit side by side at this page's width
         (max-w-2xl) without overlapping, at any viewport. The step text
         moves to a plain "Passo X di Y — Title" line below instead, same
         convention as the guided tour's stepIndicator. -->
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
