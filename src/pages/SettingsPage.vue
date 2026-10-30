<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import AppBar from "../app/_AppBar.vue";
import PageShell from "../app/_PageShell.vue";
import MainNav from "../app/MainNavigationView.vue";
import { STORE_URL } from "../config";
import { currentLocale, setLocale } from "../i18n";
import { listMine } from "../services/meals";
import { fileUrl } from "../services/pb";
import { openExternally } from "../shared/behaviour/useExternalOpen";
import { useFavoritesState } from "../shared/state/useFavoritesState";
import { useSessionState } from "../shared/state/useSessionState";
import Avatar from "../ui/adaptive/Avatar.vue";
import Button from "../ui/adaptive/Button.vue";
import Card from "../ui/adaptive/Card.vue";

const { t } = useI18n();
const router = useRouter();
const session = useSessionState();
const favorites = useFavoritesState();

const version = "0.1.0";
const mineCount = ref(0);
const shared = ref(false);

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

function toggleLanguage() {
  setLocale(currentLocale() === "ar" ? "en" : "ar");
}

async function openExternal(url: string) {
  await openExternally(url);
}

async function share() {
  const url = `${globalThis.location?.origin ?? ""}/#/welcome`;
  const payload = { title: "Wagba", text: `${t("welcome.tagline")} — Wagba`, url };
  let done = false;
  if (navigator.share) {
    try {
      await navigator.share(payload);
      done = true;
    } catch {
      /* dismissed or unavailable: fall back to the clipboard */
    }
  }
  if (!done) {
    try {
      await navigator.clipboard.writeText(`${payload.text} ${url}`);
      done = true;
    } catch {
      /* clipboard blocked */
    }
  }
  shared.value = done;
  globalThis.setTimeout(() => {
    shared.value = false;
  }, 2000);
}

onMounted(async () => {
  await session.ensureReady();
  await favorites.ensureLoaded();
  try {
    mineCount.value = (await listMine()).length;
  } catch {
    mineCount.value = 0;
  }
});
</script>

<template>
  <PageShell>
    <template #bar>
      <AppBar :title="t('settings.title')" />
    </template>

    <Card v-if="complete" class="account">
      <Avatar :src="avatarSrc" :handle="profile?.handle ?? ''" :size="56" :label="t('avatar.alt')" />
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

    <Card v-else class="welcome">
      <h2 class="welcome__title">{{ t('settings.account.incomplete.title') }}</h2>
      <p class="welcome__body">{{ t('settings.account.incomplete.body') }}</p>
      <Button :block="false" @click="router.push({ name: 'add-meal' })">
        {{ t('settings.account.incomplete.cta') }}
      </Button>
    </Card>

    <Card :padded="false">
      <button type="button" class="row" @click="router.push({ name: 'my-meals' })">
        <span>{{ t('settings.myMeals') }}</span>
        <span class="row__count">{{ mineCount }}</span>
      </button>
      <button type="button" class="row" @click="router.push({ name: 'favorites' })">
        <span>{{ t('settings.favorites') }}</span>
        <span class="row__count">{{ favorites.ids.size }}</span>
      </button>
    </Card>

    <Card :padded="false">
      <button type="button" class="row" @click="toggleLanguage">
        <span>{{ t('settings.language') }}</span>
        <span class="row__muted">{{ currentLocale() === 'ar' ? 'العربية' : 'English' }}</span>
      </button>
      <button type="button" class="row" @click="share">
        <span>{{ t('settings.share') }}</span>
        <span class="row__muted">{{ shared ? t('settings.share.done') : '' }}</span>
      </button>
    </Card>

    <Card :padded="false">
      <button type="button" class="row" @click="router.push({ name: 'about' })">
        <span>{{ t('settings.about') }}</span>
        <span class="row__chevron" aria-hidden="true">›</span>
      </button>
      <button type="button" class="row" @click="router.push({ name: 'terms' })">
        <span>{{ t('settings.terms') }}</span>
        <span class="row__chevron" aria-hidden="true">›</span>
      </button>
      <button type="button" class="row" @click="router.push({ name: 'contact' })">
        <span>{{ t('settings.contact') }}</span>
        <span class="row__chevron" aria-hidden="true">›</span>
      </button>
      <button v-if="STORE_URL" type="button" class="row" @click="openExternal(STORE_URL)">
        <span>{{ t('settings.rate') }}</span>
        <span class="row__chevron" aria-hidden="true">›</span>
      </button>
      <div class="row is-static"><span>{{ t('settings.version', { v: version }) }}</span></div>
    </Card>

    <template #bottom>
      <MainNav />
    </template>
  </PageShell>
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
.welcome {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: flex-start;
}
.welcome__title {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
}
.welcome__body {
  margin: 0;
  font-size: 13px;
  color: var(--brown-mid);
  line-height: 1.7;
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
.row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 14px 16px;
  background: none;
  border: none;
  border-bottom: 1px solid var(--border);
  font-family: inherit;
  font-size: 14px;
  color: var(--ink);
  cursor: pointer;
  text-align: start;
}
.row:last-child {
  border-bottom: none;
}
.row.is-static {
  cursor: default;
}
.row__muted {
  color: var(--brown-mid);
  font-size: 13px;
}
.row__count {
  color: var(--brown-mid);
  font-size: 13px;
}
.row__chevron {
  color: var(--border);
  font-size: 20px;
}
</style>
