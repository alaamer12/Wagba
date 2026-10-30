<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
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
// C14: a verdict for each way a share can end. `shared` is the system sheet having handed the
// link off, `copied` is the clipboard standing in for it, `refused` is neither — and a row that
// says nothing after all three looks, from the person's side, exactly like success.
type ShareVerdict = "none" | "shared" | "copied" | "refused";
const shareVerdict = ref<ShareVerdict>("none");
const storeRefused = ref(false);
// The confirmation is a courtesy, not a state: it clears itself, and the release belongs to the
// unit that set it. While this lived in a Page the timer had no teardown at all, which is what
// `TIMER_WITHOUT_CLEAR` counted.
let clearShared: ReturnType<typeof setTimeout> | undefined;

const shareHint = computed(() => {
  switch (shareVerdict.value) {
    case "shared":
      return t("settings.share.shared");
    case "copied":
      return t("settings.share.done");
    case "refused":
      return t("settings.share.refused");
    default:
      return "";
  }
});

function toggleLanguage() {
  setLocale(currentLocale() === "ar" ? "en" : "ar");
}

async function share() {
  const url = `${globalThis.location?.origin ?? ""}/#/welcome`;
  const payload = { title: "Wagba", text: `${t("welcome.tagline")} — Wagba`, url };
  let verdict: ShareVerdict = "refused";
  if (navigator.share) {
    try {
      await navigator.share(payload);
      verdict = "shared";
    } catch {
      // Dismissed, or refused by the sheet. The clipboard is not a lie here: the person asked for
      // the link to leave this screen, and a link on the clipboard left it. What must not happen
      // is the row going quiet, so the verdict says which door it actually went through.
      verdict = "refused";
    }
  }
  if (verdict === "refused") {
    try {
      await navigator.clipboard.writeText(`${payload.text} ${url}`);
      verdict = "copied";
    } catch {
      /* clipboard blocked: the refusal stays the answer */
    }
  }
  shareVerdict.value = verdict;
  clearTimeout(clearShared);
  clearShared = setTimeout(() => {
    shareVerdict.value = "none";
  }, 2000);
}

async function openStore() {
  // `openExternally` answers with a boolean, and the row never read it: a store that did not
  // open and a store that opened looked identical. Same courtesy as the share row.
  storeRefused.value = !(await openExternally(STORE_URL));
  clearTimeout(clearShared);
  clearShared = setTimeout(() => {
    storeRefused.value = false;
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
      :hint="shareHint"
      :tone="shareVerdict === 'refused' ? 'bad' : 'note'"
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
      :hint="storeRefused ? t('settings.rate.refused') : ''"
      :tone="storeRefused ? 'bad' : 'note'"
      @activate="openStore"
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
