<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import AppAvatar from "../components/base/AppAvatar.vue";
import AppCard from "../components/base/AppCard.vue";
import AppBar from "../components/layout/AppBar.vue";
import BottomBar from "../components/layout/BottomBar.vue";
import PageShell from "../components/layout/PageShell.vue";
import { currentLocale, setLocale } from "../i18n";
import { fileUrl } from "../services/pb";
import { useFavoritesStore } from "../stores/favorites";
import { useSessionStore } from "../stores/session";

const { t } = useI18n();
const router = useRouter();
const session = useSessionStore();
const favorites = useFavoritesStore();

const version = "0.1.0";
const avatarSrc = computed(() => {
  const p = session.profile;
  return p?.avatar ? fileUrl({ collectionId: p.collectionId ?? "", id: p.id }, p.avatar) : "";
});

function toggleLanguage() {
  setLocale(currentLocale() === "ar" ? "en" : "ar");
}

onMounted(async () => {
  if (!session.profile) await session.refresh();
  if (!favorites.loaded) await favorites.load();
});
</script>

<template>
  <PageShell>
    <template #bar>
      <AppBar :title="t('settings.title')" />
    </template>

    <AppCard class="account">
      <AppAvatar :src="avatarSrc" :size="56" :label="t('avatar.alt')" />
      <div class="account__text">
        <span class="account__name">{{ session.profile?.display_name }}</span>
        <span class="account__handle">@{{ session.profile?.handle }}</span>
        <span class="account__area">{{ session.profile?.location_text }}</span>
      </div>
      <button type="button" class="link" @click="router.push({ name: 'profile-setup' })">{{ t('settings.account.section') }}</button>
    </AppCard>

    <AppCard :padded="false">
      <button type="button" class="row" @click="router.push({ name: 'my-meals' })">
        <span>{{ t('settings.myMeals') }}</span><span class="row__chevron">›</span>
      </button>
      <button type="button" class="row" @click="router.push({ name: 'favorites' })">
        <span>{{ t('settings.favorites') }}</span><span class="row__chevron">›</span>
      </button>
    </AppCard>

    <AppCard :padded="false">
      <div class="row is-static">
        <span>{{ t('settings.notifications') }}</span>
        <span class="row__muted">—</span>
      </div>
      <button type="button" class="row" @click="toggleLanguage">
        <span>{{ t('settings.language') }}</span>
        <span class="row__muted">{{ currentLocale() === 'ar' ? 'العربية' : 'English' }}</span>
      </button>
    </AppCard>

    <AppCard :padded="false">
      <div class="row is-static"><span>{{ t('settings.about') }}</span></div>
      <div class="row is-static"><span>{{ t('settings.terms') }}</span></div>
      <div class="row is-static"><span>{{ t('settings.contact') }}</span></div>
      <div class="row is-static"><span>{{ t('settings.version', { v: version }) }}</span></div>
    </AppCard>

    <template #bottom>
      <BottomBar />
    </template>
  </PageShell>
</template>

<style scoped>
.account {
  display: flex;
  align-items: center;
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
.account__area {
  font-size: 12px;
  color: var(--brown-mid);
}
.link {
  background: none;
  border: none;
  color: var(--brown-mid);
  font-family: inherit;
  font-size: 13px;
  text-decoration: underline;
  cursor: pointer;
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
.row__chevron {
  color: var(--border);
  font-size: 20px;
}
</style>
