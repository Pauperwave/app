<!-- app\components\tesseramento\ConsentsStep.vue -->
<!--
  Extracted out of tesseramento/index.vue's `currentStep === 'consents'`
  step (2026-08-16) — see EmailStep.vue's own header for why. `state` is the
  SAME reactive object the parent binds to its own <UForm :state>, mutated
  directly — same convention as tournaments/fields/SchedulingFields.vue.
-->
<!-- eslint-disable vue/no-mutating-props -- see the comment above -->
<script setup lang="ts">
interface ConsentsStepState {
  has_read_statute?: boolean
  consent_data?: boolean
  consent_social?: boolean
}

defineProps<{ state: ConsentsStepState }>()
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
  <div class="space-y-2">
    <UFormField name="has_read_statute">
      <UCheckbox
        v-model="state.has_read_statute"
        required
        :label="$t('associate.addModal.consents.statuteLabel')"
        size="lg"
      >
        <template #description>
          <!-- External, not /tesseramento/statuto: the statute is the
               association's own governance document, published on
               the blog independently of this app — linking to that
               canonical copy avoids two versions drifting apart. The
               icon marks it as leaving the app's domain, unlike the
               two consents below (still internal pages). -->
          <a
            href="https://blog.pauperwave.org/docs/statuto"
            target="_blank"
            rel="noopener noreferrer"
            class="underline inline-flex items-center gap-1"
          >
            {{ $t('tesseramento.steps.consents.openStatuto') }}
            <UIcon :name="ICONS.externalLink" class="size-3.5" />
          </a>
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
          <NuxtLink to="/tesseramento/informativa-dati" target="_blank" class="underline">
            {{ $t('tesseramento.steps.consents.openData') }}
          </NuxtLink>
        </template>
      </UCheckbox>
    </UFormField>
    <AssociatesFieldsConsentSocialField :state="state" />
  </div>
</template>
