<!-- app\pages\(settings)\settings\index.vue -->
<script setup lang="ts">
import * as v from 'valibot'

definePageMeta({ permission: 'access-settings' })

const fileRef = ref<HTMLInputElement>()
const { t } = useI18n()

useSeoMeta({ title: () => t('settings.layout.links.general') })

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
const toast = useToast()
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
