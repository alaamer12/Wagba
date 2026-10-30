<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { STORE_URL } from "../../../../config";
import { currentLocale, setLocale } from "../../../../i18n";
import { listMine } from "../../../../services/meals";
import { openExternally } from "../../../../shared/behaviour/useExternalOpen";
import { useFavoritesState } from "../../../../shared/state/useFavoritesState";
import { useSessionState } from "../../../../shared/state/useSessionState";
import Card from "../../../../ui/adaptive/Card.vue";
import SettingsRow from "./SettingsRow.vue";

// Everything below the account block: the two tallies, the two device actions, and the rows
// that leave the screen. It is one View because the three cards answer one question — what can
// this person reach from here — and the answers are facts: what the account holds, how many
// meals are ours, what the device is configured with.
//
// The routes are decided here rather than by the page: M7 moves one of these targets, and a
// page that held them would be a second place knowing the route table.
const { t } = useI18n();
const router = useRouter();
const session = useSessionState();
const favorites = useFavoritesState();

const version = "0.1.0";
const mineCount = ref(0);
const shared = ref(false);
// The confirmation is a courtesy, not a state: it clears itself, and the release belongs to the
// unit that set it. While this lived in a Page the timer had no teardown at all, which is what
// `TIMER_WITHOUT_CLEAR` counted.
let clearShared: ReturnType<typeof setTimeout> | undefined;

function toggleLanguage() {
  setLocale(currentLocale() === "ar" ? "en" : "ar");
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
  clearTimeout(clearShared);
  clearShared = setTimeout(() => {
    shared.value = false;
  }, 2000);
}

onUnmounted(() => clearTimeout(clearShared));

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
  <Card :padded="false">
    <SettingsRow
      :label="t('settings.myMeals')"
      :value="String(mineCount)"
      @activate="router.push({ name: 'my-meals' })"
    />
    <SettingsRow
      :label="t('settings.favorites')"
      :value="String(favorites.ids.size)"
      @activate="router.push({ name: 'favorites' })"
    />
  </Card>

  <Card :padded="false">
    <SettingsRow
      :label="t('settings.language')"
      :hint="currentLocale() === 'ar' ? 'العربية' : 'English'"
      @activate="toggleLanguage"
    />
    <SettingsRow
      :label="t('settings.share')"
      :hint="shared ? t('settings.share.done') : ''"
      @activate="share"
    />
  </Card>

  <Card :padded="false">
    <SettingsRow :label="t('settings.about')" chevron @activate="router.push({ name: 'about' })" />
    <SettingsRow :label="t('settings.terms')" chevron @activate="router.push({ name: 'terms' })" />
    <SettingsRow
      :label="t('settings.contact')"
      chevron
      @activate="router.push({ name: 'contact' })"
    />
    <SettingsRow
      v-if="STORE_URL"
      :label="t('settings.rate')"
      chevron
      @activate="openExternally(STORE_URL)"
    />
    <div class="row is-static"><span>{{ t('settings.version', { v: version }) }}</span></div>
  </Card>
</template>

<style scoped>
.row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
  color: var(--ink);
  text-align: start;
}
.row:last-child {
  border-bottom: none;
}
.row.is-static {
  cursor: default;
}
</style>
