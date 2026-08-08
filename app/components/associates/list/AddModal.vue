<!-- app\components\associates\list\AddModal.vue -->
<script setup lang="ts">
import * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import { CalendarDate, getLocalTimeZone } from '@internationalized/date'
import { vMaska } from 'maska/vue'

// Define the model to accept open state from parent
const open = defineModel<boolean>({ default: false })
const toast = useToast()
const { t } = useI18n()

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

const schema = v.object({
  associate_type: v.picklist(['Ordinario', 'Sostenitore']),
  first_name: v.pipe(v.string(), v.minLength(2, t('associate.addModal.validation.firstNameTooShort'))),
  last_name: v.pipe(v.string(), v.minLength(2, t('associate.addModal.validation.lastNameTooShort'))),
  // trim/toLowerCase sono trasformazioni (non falliscono mai da sole),
  // v.email() valida il formato dopo la normalizzazione — stesso ordine
  // della pipeline Zod precedente.
  email_address: v.pipe(
    v.string(),
    v.trim(),
    v.email(t('associate.addModal.validation.invalidEmail')),
    v.toLowerCase()
  ),
  phone_number: v.pipe(
    v.string(),
    v.regex(/^\d{10,15}$/, t('associate.addModal.validation.invalidPhoneNumber'))
  ),
  tax_code: v.pipe(
    v.string(),
    v.regex(/^[A-Z0-9]{16}$/i, t('associate.addModal.validation.invalidTaxCode'))
  ),
  born_location: v.pipe(v.string(), v.minLength(2, t('associate.addModal.validation.birthLocationRequired'))),
  born_date: v.pipe(v.date(), v.maxValue(new Date(), t('associate.addModal.validation.birthDateNotFuture'))),
  born_province: v.pipe(v.string(), v.length(2, t('associate.addModal.validation.birthProvinceRequired'))),
  born_state: v.pipe(v.string(), v.minLength(2, t('associate.addModal.validation.birthStateRequired'))),
  residency_address: v.pipe(
    v.string(),
    v.minLength(5, t('associate.addModal.validation.residencyAddressRequired'))
  ),
  residency_city: v.pipe(v.string(), v.minLength(2, t('associate.addModal.validation.residencyCityRequired'))),
  residency_province: v.pipe(
    v.string(),
    v.length(2, t('associate.addModal.validation.residencyProvinceInvalid'))
  ),
  residency_cap: v.pipe(
    v.string(),
    v.regex(/^\d{5}$/, t('associate.addModal.validation.residencyCapInvalid'))
  ),
  mtgo_nickname: v.nullable(v.string()),
  mtga_nickname: v.nullable(v.string()),
  // v.check invece di v.literal(true, ...): v.literal restringerebbe il TIPO
  // inferito a `true`, incompatibile con lo stato iniziale `false` (checkbox
  // non ancora spuntata) — v.check su v.boolean() valida senza restringere
  // il tipo, stessa semantica del .refine(val => val === true) Zod originale.
  consent_data: v.pipe(
    v.boolean(),
    v.check(val => val === true, t('associate.addModal.validation.consentDataRequired'))
  ),
  consent_social: v.optional(v.boolean()),
  has_read_statute: v.pipe(
    v.boolean(),
    v.check(val => val === true, t('associate.addModal.validation.statuteReadRequired'))
  ),
  has_acknowledged_surveillance_notice: v.pipe(
    v.boolean(),
    v.check(val => val === true, t('associate.addModal.validation.surveillanceAckRequired'))
  )
})

type Schema = v.InferOutput<typeof schema>

const state = reactive<Schema>({
  associate_type: 'Ordinario',
  first_name: '',
  last_name: '',
  email_address: '',
  phone_number: '',
  tax_code: '',
  born_location: '',
  born_date: new Date('1990-01-01'),
  born_province: '',
  born_state: '',
  residency_address: '',
  residency_city: '',
  residency_province: '',
  residency_cap: '',
  mtgo_nickname: null,
  mtga_nickname: null,
  has_read_statute: false,
  has_acknowledged_surveillance_notice: false,
  consent_data: false,
  consent_social: false
})

// calendar sync
const calendarDate = computed<CalendarDate | null>({
  get: () => state.born_date
    ? new CalendarDate(
      state.born_date.getFullYear(),
      state.born_date.getMonth() + 1,
      state.born_date.getDate()
    )
    : null,
  set: (newDate) => {
    state.born_date = newDate ? newDate.toDate(getLocalTimeZone()) : new Date('1990-01-01')
  }
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    toast.add({
      title: t('associate.addModal.successToastTitle'),
      description: t('associate.addModal.successToastDescription', {
        name: `${event.data.first_name} ${event.data.last_name}`
      }),
      color: 'success'
    })
    open.value = false
  } catch (err) {
    toast.add({
      title: t('associate.addModal.errorToastTitle'),
      description: t('associate.addModal.errorToastDescription', {
        message: err instanceof Error ? err.message : String(err)
      }),
      color: 'error'
    })
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :dismissible="false"
    :ui="{ content: 'max-w-2xl' }"
    :title="$t('associate.addModal.title')"
    :description="$t('associate.addModal.description')"
  >
    <UButton
      :label="$t('associate.addModal.openButton')"
      icon="i-lucide-user-plus"
      @click="open = true"
    />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-2"
        @submit="onSubmit"
      >
        <!-- eslint-disable -->
        <!-- Tipologia associato -->
        <div>
          <h3 class="text-lg font-semibold text-primary">{{ $t('associate.addModal.sections.associateType') }}</h3>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <UFormField :label="$t('associate.addModal.fields.associateType')" name="associate_type">
              <USelect v-model="state.associate_type" :items="['Ordinario', 'Sostenitore']" class="w-full" />
            </UFormField>
          </div>
        </div>

        <!-- Informazioni personali -->
        <div id="personal-info-section">
          <h3 class="text-lg font-semibold text-primary">{{ $t('associate.addModal.sections.personalInfo') }}</h3>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <UFormField :label="$t('associate.addModal.fields.firstName')" name="name" required>
              <UInput v-model="state.first_name" name="name" autocomplete="given-name" class="w-full" />
            </UFormField>
            <UFormField :label="$t('associate.addModal.fields.lastName')" name="surname" required>
              <UInput v-model="state.last_name" name="surname" autocomplete="family-name" class="w-full" />
            </UFormField>
            <UFormField :label="$t('associate.addModal.fields.email')" name="email" required>
              <UInput v-model="state.email_address" autocomplete="email" class="w-full" />
            </UFormField>
            <UFormField :label="$t('associate.addModal.fields.phoneNumber')" name="phone_number" required>
              <UInput v-maska="'(+39) ### #######'" icon="i-lucide-phone" v-model="state.phone_number" autocomplete="tel" class="w-full" />
            </UFormField>
          </div>
        </div>

        <!-- Informazioni di nascita -->
        <div id="birth-section">
          <h3 class="text-lg font-semibold text-primary">{{ $t('associate.addModal.sections.birthInfo') }}</h3>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <UFormField :label="$t('associate.addModal.fields.birthLocation')" name="born_location" required>
              <UInput v-model="state.born_location" class="w-full" />
            </UFormField>

            <UFormField :label="$t('associate.addModal.fields.birthDate')" name="born_date" required>
              <!-- Input nascosto per autofill e validazione Zod -->
              <input
                type="date"
                v-model="state.born_date"
                name="born_date"
                autocomplete="bday"
                class="hidden"
              />

              <!-- Pulsante calendario -->
              <UPopover>
                <UButton
                  color="neutral"
                  variant="outline"
                  class="w-full justify-start"
                  icon="i-lucide-calendar"
                >
                  {{ state.born_date ? formatDate(state.born_date) : $t('associate.addModal.fields.selectBirthDate') }}
                </UButton>

                <template #content>
                  <UCalendar
                    v-model="calendarDate"
                    :default-value="new CalendarDate(1995, 1, 1)"
                    class="p-2"
                  />
                </template>
              </UPopover>
            </UFormField>

            <UFormField :label="$t('associate.addModal.fields.birthProvince')" name="born_province" required>
              <UInput v-model="state.born_province" class="w-full" />
            </UFormField>
            <UFormField :label="$t('associate.addModal.fields.birthState')" name="born_state" required>
              <UInput v-model="state.born_state" class="w-full" />
            </UFormField>
          </div>
        </div>

        <!-- Informazioni fiscali -->
        <div id="fiscal-section">
          <h3 class="text-lg font-semibold text-primary">{{ $t('associate.addModal.sections.fiscalInfo') }}</h3>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <UFormField :label="$t('associate.addModal.fields.taxCode')" name="tax_code" required>
              <UInput v-model="state.tax_code" class="w-full" />
            </UFormField>
          </div>
        </div>

        <!-- Residenza -->
        <div id="residency-section">
          <h3 class="text-lg font-semibold text-primary">{{ $t('associate.addModal.sections.residencyInfo') }}</h3>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <UFormField :label="$t('associate.addModal.fields.residencyAddress')" name="residency_address" required>
              <UInput v-model="state.residency_address" autocomplete="address-line1" class="w-full" />
            </UFormField>
            <UFormField :label="$t('associate.addModal.fields.residencyCity')" name="residency_city" required>
              <UInput v-model="state.residency_city" autocomplete="address-line2" class="w-full" />
            </UFormField>
            <UFormField :label="$t('associate.addModal.fields.residencyProvince')" name="residency_province" required>
              <UInput v-model="state.residency_province" autocomplete="state" class="w-full" />
            </UFormField>
            <UFormField :label="$t('associate.addModal.fields.residencyCap')" name="residency_cap" required>
              <UInput v-model="state.residency_cap" autocomplete="postal-code" class="w-full" />
            </UFormField>
          </div>
        </div>

        <!-- Nickname MTG -->
        <div id="mtg-nicknames-section">
          <h3 class="text-lg font-semibold text-primary">{{ $t('associate.addModal.sections.mtgNicknames') }}</h3>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <UFormField :label="$t('associate.addModal.fields.mtgoNickname')" name="mtgo_nickname">
              <UInput
                :model-value="state.mtgo_nickname ?? ''"
                class="w-full"
                @update:model-value="state.mtgo_nickname = ($event as string) || null"
              />
            </UFormField>
            <UFormField :label="$t('associate.addModal.fields.mtgaNickname')" name="mtga_nickname">
              <UInput
                :model-value="state.mtga_nickname ?? ''"
                class="w-full"
                @update:model-value="state.mtga_nickname = ($event as string) || null"
              />
            </UFormField>
          </div>
        </div>

        <!-- Consensi -->
        <div id="consents-section">
          <h3 class="text-lg font-semibold text-primary">{{ $t('associate.addModal.sections.consents') }}</h3>
          <div class="mt-2 space-y-2">
            <UFormField name="has_read_statute">
              <UCheckbox
                v-model="state.has_read_statute"
                required
                :label="$t('associate.addModal.consents.statuteLabel')"
                size="lg"
              >
                <template #description>
                  {{ $t('associate.addModal.consents.statuteDescription') }}
                </template>
              </UCheckbox>
            </UFormField>
            <UFormField name="has_acknowledged_surveillance_notice">
              <UCheckbox
                v-model="state.has_acknowledged_surveillance_notice"
                required
                :label="$t('associate.addModal.consents.surveillanceLabel')"
                size="lg"
              >
                <template #description>
                  {{ $t('associate.addModal.consents.surveillanceDescription') }}
                </template>
              </UCheckbox>
            </UFormField>
            <UFormField name="consent_data">
              <UCheckbox
                v-model="state.consent_data"
                required
                :label="$t('associate.addModal.consents.dataLabel')"
                size="lg"
              >
                <template #description>
                  {{ $t('associate.addModal.consents.dataDescription') }}
                </template>
              </UCheckbox>
            </UFormField>
            <UFormField name="consent_social">
              <UCheckbox
                v-model="state.consent_social"
                :label="$t('associate.addModal.consents.socialLabel')"
                size="lg"
              >
                <template #description>
                  {{ $t('associate.addModal.consents.socialDescription') }}
                </template>
              </UCheckbox>
            </UFormField>
          </div>
        </div>

        <!-- Azioni -->
        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('associate.addModal.cancel')"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            :label="$t('associate.addModal.create')"
            color="primary"
            variant="solid"
            type="submit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
