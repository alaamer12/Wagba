<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import AppAvatar from "../components/base/AppAvatar.vue";
import AppButton from "../components/base/AppButton.vue";
import AppField from "../components/base/AppField.vue";
import AppBar from "../components/layout/AppBar.vue";
import PageShell from "../components/layout/PageShell.vue";
import { slugify } from "../services/handles";
import { fileUrl } from "../services/pb";
import { useSessionState } from "../shared/state/useSessionState";
import { AppError } from "../types/errors";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const session = useSessionState();

const displayName = ref(session.profile?.display_name ?? "");
const whatsapp = ref(session.profile?.whatsapp ?? "");
const locationText = ref(session.profile?.location_text ?? "");
const facebook = ref(session.profile?.facebook_url ?? "");
const instagram = ref(session.profile?.instagram_url ?? "");
const tiktok = ref(session.profile?.tiktok_url ?? "");
const error = ref("");
const saving = ref(false);

// The rule lives on the session state; this only resolves the value to display.
const frozenHandle = computed(() => (session.handleFrozen ? (session.profile?.handle ?? "") : ""));
const handleBase = ref("");
const handlePreview = computed(() => {
  if (frozenHandle.value) return frozenHandle.value;
  return (handleBase.value || slugify(displayName.value) || "…").replace(/[^a-z0-9]/g, "");
});
const avatarSrc = computed(() => {
  const profile = session.profile;
  return profile?.avatar
    ? fileUrl({ collectionId: profile.collectionId ?? "", id: profile.id }, profile.avatar)
    : "";
});

async function save() {
  error.value = "";
  saving.value = true;
  try {
    const payload = {
      displayName: displayName.value,
      whatsapp: whatsapp.value,
      locationText: locationText.value,
      facebook: facebook.value,
      instagram: instagram.value,
      tiktok: tiktok.value,
    };
    await session.save(handleBase.value ? { ...payload, handle: handleBase.value } : payload);
    const from = route.query.from as string | undefined;
    router.replace({ name: from ?? "settings" });
  } catch (err) {
    if (err instanceof AppError && err.code === "DISPLAY_NAME_INVALID")
      error.value = t("error.displayName.letters");
    else if (err instanceof AppError && err.code === "HANDLE_TAKEN")
      error.value = t("error.handle.taken");
    else error.value = t("error.fault.body");
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  if (!session.profile) await session.refresh();
  displayName.value = session.profile?.display_name ?? displayName.value;
  whatsapp.value = session.profile?.whatsapp ?? whatsapp.value;
  locationText.value = session.profile?.location_text ?? locationText.value;
});
</script>

<template>
  <PageShell :with-bar="false">
    <template #bar>
      <AppBar :title="session.isComplete ? t('settings.account.section') : t('profile.title')" back />
    </template>

    <div class="intro">
      <AppAvatar :src="avatarSrc" :handle="handlePreview" :size="76" :label="t('avatar.alt')" />
      <p class="intro__sub">{{ session.isComplete ? t('settings.account.section') : t('profile.subtitle') }}</p>
      <p class="intro__hint">{{ t('profile.avatar.hint') }}</p>
    </div>

    <form class="form" @submit.prevent="save">
      <AppField v-model="displayName" :label="t('profile.name.label')" :placeholder="t('profile.name.placeholder')" required />
      <div class="handle">
        <span class="handle__label">{{ t('profile.handle.label') }}</span>
        <span v-if="frozenHandle" class="handle__value is-frozen">@{{ frozenHandle }}</span>
        <input
          v-else
          v-model="handleBase"
          class="handle__input"
          :placeholder="handlePreview"
          aria-label="handle"
          autocapitalize="off"
          spellcheck="false"
        />
        <span class="handle__hint">{{ frozenHandle ? t('profile.handle.frozen') : t('profile.handle.hint') }}</span>
      </div>
      <AppField v-model="whatsapp" :label="t('profile.whatsapp.label')" :placeholder="t('profile.whatsapp.placeholder')" type="tel" required />
      <AppField v-model="locationText" :label="t('profile.location.label')" required />

      <h3 class="section">{{ t('profile.social.heading') }}</h3>
      <AppField v-model="facebook" label="Facebook" type="url" />
      <AppField v-model="instagram" label="Instagram" type="url" />
      <AppField v-model="tiktok" label="TikTok" type="url" />

      <p v-if="error" class="error">{{ error }}</p>
      <AppButton type="submit" :loading="saving">{{ t('profile.save') }}</AppButton>
    </form>
  </PageShell>
</template>

<style scoped>
.intro {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}
.intro__sub {
  margin: 0;
  font-weight: 700;
}
.intro__hint {
  margin: 0;
  font-size: 12px;
  color: var(--brown-mid);
  max-width: 36ch;
}
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.handle {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px;
  border: 1px dashed var(--border);
  border-radius: var(--radius-field);
}
.handle__label {
  font-size: 13px;
  color: var(--brown-mid);
}
.handle__value {
  font-weight: 800;
  font-size: 16px;
}
.handle__value.is-frozen {
  color: var(--brown-mid);
}
.handle__input {
  font-family: inherit;
  font-size: 16px;
  font-weight: 800;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-field);
  padding: 10px 14px;
  width: 100%;
}
.handle__input:focus {
  outline: 2px solid var(--butter);
}
.handle__hint {
  font-size: 12px;
  color: var(--brown-mid);
}
.section {
  margin: var(--space-2) 0 0;
  font-size: 15px;
  font-weight: 800;
}
.error {
  color: var(--danger);
  font-size: 13px;
  margin: 0;
}
</style>
