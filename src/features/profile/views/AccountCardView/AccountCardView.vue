<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { fileUrl } from "../../../../services/pb";
import { openExternally } from "../../../../shared/behaviour/useExternalOpen";
import { useSessionState } from "../../../../shared/state/useSessionState";
import Avatar from "../../../../ui/adaptive/Avatar.vue";
import Card from "../../../../ui/adaptive/Card.vue";

// The complete half of the account region: the summary of who is signed in, or nothing.
//
// It decides for itself (`session.isComplete`) because the other half is `AccountCtaView`, and
// a Page that picked between the two would be reading a fact — `PAGE_READS_FACT` refuses that.
// The route it offers also lives here: milestone M7 changes where the edit goes, and a link
// whose destination is decided by the page mounting it would be a second place knowing routes.
const { t } = useI18n();
const router = useRouter();
const session = useSessionState();

const profile = computed(() => session.profile);
const complete = computed(() => session.isComplete);
const avatarSrc = computed(() => {
  const p = profile.value;
  return p?.avatar ? fileUrl({ collectionId: p.collectionId ?? "", id: p.id }, p.avatar) : "";
});
const socials = computed(() =>
  [
    { key: "facebook", label: "Facebook", url: profile.value?.facebook_url ?? "" },
    { key: "instagram", label: "Instagram", url: profile.value?.instagram_url ?? "" },
    { key: "tiktok", label: "TikTok", url: profile.value?.tiktok_url ?? "" },
  ].filter((s) => s.url.length > 0),
);

// Provisioning is awaited here as it was on the page. `boot` is shared, so this and
// `AccountCtaView` wait for one attempt rather than two.
onMounted(async () => {
  await session.ensureReady();
});

async function openExternal(url: string) {
  await openExternally(url);
}
</script>

<template>
  <Card v-if="complete" class="account">
    <Avatar :src="avatarSrc" :handle="profile?.handle ?? ''" :display-name="profile?.display_name ?? ''" :size="56" :label="t('avatar.alt')" />
    <div class="account__text">
      <span class="account__name">{{ profile?.display_name }}</span>
      <span class="account__handle">@{{ profile?.handle }}</span>
      <span class="account__meta">{{ profile?.whatsapp }}</span>
      <span class="account__meta">{{ profile?.location_text }}</span>
      <div v-if="socials.length" class="account__socials">
        <button
          v-for="social in socials"
          :key="social.key"
          type="button"
          class="social"
          @click="openExternal(social.url)"
        >
          {{ social.label }}
        </button>
      </div>
    </div>
    <button type="button" class="link" @click="router.push({ name: 'profile-setup' })">
      {{ t('settings.edit') }}
    </button>
  </Card>
</template>

<style scoped>
.account {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}
.account__text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}
.account__name {
  font-weight: 800;
}
.account__handle,
.account__meta {
  font-size: 12px;
  color: var(--brown-mid);
}
.account__socials {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.social {
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  color: var(--brown-mid);
  background: none;
  border: none;
  padding: 0;
  text-decoration: underline;
  cursor: pointer;
}
.link {
  background: none;
  border: none;
  color: var(--brown-mid);
  font-family: inherit;
  font-size: 13px;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
}
</style>
