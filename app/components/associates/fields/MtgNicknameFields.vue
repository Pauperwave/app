<!-- app\components\associates\fields\MtgNicknameFields.vue -->
<!--
  Shared by AddModal.vue and /tesseramento — see PersonalInfoFields.vue for
  the state-mutation rationale (same pattern, `vue/no-mutating-props`
  disabled below for the same reason).
-->
<!-- eslint-disable vue/no-mutating-props -- see PersonalInfoFields.vue -->
<script setup lang="ts">
// AddModal.vue's state is a full Schema (never undefined); /tesseramento's is
// a Partial<Schema> (fields start undefined until the user reaches that step)
// — the union covers both without either file casting.
interface MtgNicknameState {
  mtgo_nickname?: string | null
  mtga_nickname?: string | null
}

const { state } = defineProps<{ state: MtgNicknameState }>()
</script>

<template>
  <!-- eslint-disable vue/no-mutating-props -- see the top-of-file comment -->
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
</template>
