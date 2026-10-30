<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import AppBar from "../../../../app/_AppBar.vue";
import { type Kind, resolveRegion } from "../../../../lib/region";
import { handleBase, isUsableBase, slugify } from "../../../../services/handles";
import { fileUrl } from "../../../../services/pb";
import { useForcedRegionCondition } from "../../../../shared/conditions/useForcedRegionCondition";
import {
  type HandleVerdict,
  useHandleAvailabilityState,
} from "../../../../shared/state/useHandleAvailabilityState";
import { useSessionState } from "../../../../shared/state/useSessionState";
import { AppError, toAppError } from "../../../../types/errors";
import Avatar from "../../../../ui/adaptive/Avatar.vue";
import Button from "../../../../ui/adaptive/Button.vue";
import Field from "../../../../ui/adaptive/Field.vue";
import FaultRendition from "../../../../ui/renditions/FaultRendition.vue";
import LoadingRendition from "../../../../ui/renditions/LoadingRendition.vue";
import HandleField from "../../components/HandleField.vue";

// The account form: what the profile holds, what the handle will become, and what happens when
// the server says no. It owns the whole exchange — the write, the error surface, the redirect
// back to wherever the user came from — because a Page that held the save button would have to
// read the session to know whether it was editing or completing.
//
// It also owns the case the screen never had (C16): when provisioning did not come back, this
// View drew the form anyway and offered Save on an account that does not exist. The ladder
// decides now, and a `failed` session is a `fault` — a request of ours that did not land, with a
// retry that runs the request again. Not `blocked`: nothing on the device has to be turned on.
const { t } = useI18n();
const route = useRoute();
const router = useRouter();

// The plus button routes here when the account cannot publish yet; the reason is only true for
// that arrival, not for someone opening Settings on purpose.
const arrivedFromAdd = computed(() => route.query.from === "add-meal" && !session.isComplete);
const session = useSessionState();
const availability = useHandleAvailabilityState();
const { forced } = useForcedRegionCondition();

const displayName = ref(session.profile?.display_name ?? "");
const whatsapp = ref(session.profile?.whatsapp ?? "");
const locationText = ref(session.profile?.location_text ?? "");
const facebook = ref(session.profile?.facebook_url ?? "");
const instagram = ref(session.profile?.instagram_url ?? "");
const tiktok = ref(session.profile?.tiktok_url ?? "");
const nameError = ref("");
const whatsappError = ref("");
const locationError = ref("");
// The line for a refusal that names no field. A form with nowhere to put the server's own
// verdict fails silently, so this stays — one line, and never for a field the form could read.
const formError = ref("");
const saving = ref(false);
const starting = ref(true);
const bootFailed = ref(false);

// The rule lives on the session state; this only resolves the value to display.
const frozenHandle = computed(() => (session.handleFrozen ? (session.profile?.handle ?? "") : ""));
const typedHandle = ref("");
const typedBase = computed(() => handleBase(typedHandle.value));
const derivedBase = computed(() => slugify(displayName.value));
// What the person is asking for, whether or not it can be had: their own letters when they typed
// some, the name's slug otherwise. The availability question is asked about this.
const askedBase = computed(() => typedBase.value || derivedBase.value);
const askedSource = computed<"typed" | "derived">(() => (typedBase.value ? "typed" : "derived"));
// What the save will actually build: `saveProfile` falls back to the name's slug when the base
// cannot be used, and a preview that promised the ignored base would be a promise the server
// breaks. The screen shows the handle the account is going to get.
const effectiveBase = computed(() => (isUsableBase(askedBase.value) ? askedBase.value : ""));
const handlePreview = computed(() => {
  if (frozenHandle.value) return frozenHandle.value;
  return effectiveBase.value || derivedBase.value || "…";
});
const avatarSrc = computed(() => {
  const profile = session.profile;
  return profile?.avatar
    ? fileUrl({ collectionId: profile.collectionId ?? "", id: profile.id }, profile.avatar)
    : "";
});

const handleVerdict = computed<HandleVerdict>(() =>
  frozenHandle.value ? "idle" : availability.verdictFor(askedBase.value),
);
const handleNote = computed(() => {
  if (frozenHandle.value) return "";
  switch (handleVerdict.value) {
    case "checking":
      return t("profile.handle.checking");
    case "free":
      return t("profile.handle.free");
    case "taken":
      return t("error.handle.taken");
    case "reserved":
      return t("error.handle.reserved");
    case "short":
      return t("profile.handle.short");
    case "unknown":
      return t("profile.handle.unknown");
    default:
      return "";
  }
});
// A base the server will not hand out is not a field the person can feel settled about.
const handleUnusable = computed(
  () => handleVerdict.value === "taken" || handleVerdict.value === "reserved",
);
const handleTone = computed<"note" | "bad">(() => {
  const answer = handleVerdict.value;
  return answer === "checking" || answer === "free" || answer === "unknown" ? "note" : "bad";
});

watch([askedBase, askedSource], ([base, source]) => {
  if (frozenHandle.value) return;
  availability.ask({ base, source });
});

const kind = computed<Kind>(() => {
  const override = forced.value;
  if (override?.facts) return resolveRegion(override.facts);
  if (override) return override.kind;
  return resolveRegion({
    inFlight: starting.value,
    hasRows: Boolean(session.profile),
    read: session.phase === "ready" && !bootFailed.value,
  });
});

/** The rule the `required` marks on these fields already claim, applied where it can be read. */
function validate(): boolean {
  const name = displayName.value.trim();
  nameError.value = !name
    ? t("error.field.required", { field: t("profile.name.label") })
    : slugify(name).length < 3
      ? t("error.displayName.letters")
      : "";
  whatsappError.value = whatsapp.value.trim()
    ? ""
    : t("error.field.required", { field: t("profile.whatsapp.label") });
  locationError.value = locationText.value.trim()
    ? ""
    : t("error.field.required", { field: t("profile.location.label") });
  formError.value = "";
  return !nameError.value && !whatsappError.value && !locationError.value;
}

// A message that outlives the correction it describes is a second opinion nobody asked for.
watch(displayName, () => {
  nameError.value = "";
});
watch(whatsapp, () => {
  whatsappError.value = "";
});
watch(locationText, () => {
  locationError.value = "";
});

const returnTo = computed(() => {
  const from = route.query.from;
  return typeof from === "string" && router.hasRoute(from) ? from : "settings";
});

async function save() {
  if (!validate()) return;
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
    await session.save(typedBase.value ? { ...payload, handle: typedBase.value } : payload);
    router.replace({ name: returnTo.value });
  } catch (err) {
    // A refusal goes to the field that caused it. `saveProfile` answers with an `AppError` and
    // not the engine's field names, so a refusal that names nothing lands on the one line below.
    if (err instanceof AppError && err.code === "DISPLAY_NAME_INVALID") {
      nameError.value = t("error.displayName.letters");
    } else if (err instanceof AppError && err.code === "HANDLE_TAKEN") {
      availability.rememberTaken(askedBase.value);
    } else if (toAppError(err).code === "NET_UNREACHABLE") {
      formError.value = t("error.offline.body");
    } else {
      formError.value = t("error.fault.body");
    }
  } finally {
    saving.value = false;
  }
}

async function start() {
  starting.value = true;
  bootFailed.value = false;
  try {
    // `boot` is idempotent while it runs and re-armed once it fails, so this retry really does
    // provision again rather than re-reading the same failure.
    await session.ensureReady();
    await session.refresh();
    displayName.value = session.profile?.display_name ?? displayName.value;
    whatsapp.value = session.profile?.whatsapp ?? whatsapp.value;
    locationText.value = session.profile?.location_text ?? locationText.value;
  } catch {
    bootFailed.value = true;
  } finally {
    starting.value = false;
  }
}

onMounted(start);

// The debounced lookup is this screen's work; leaving must not leave a timer running behind.
onUnmounted(() => availability.reset());
</script>

<template>
  <AppBar :title="session.isComplete ? t('settings.account.section') : t('profile.title')" back />

  <section :data-kind="kind" class="account-form">
    <LoadingRendition v-if="kind === 'loading'" :rows="4" />

    <FaultRendition v-else-if="kind === 'fault'" @retry="start" />

    <template v-else-if="kind === 'ready' || kind === 'empty'">
      <div class="intro">
        <Avatar :src="avatarSrc" :handle="handlePreview" :display-name="displayName" :size="76" :label="t('avatar.alt')" />
        <p class="intro__sub">
          {{ session.isComplete ? t("settings.account.section") : t("profile.subtitle") }}
        </p>
        <p class="intro__hint">{{ t("profile.avatar.hint") }}</p>
        <!-- Why this screen appeared when the person tapped "add a meal": the plus decides its
             target, and a redirect with no reason is indistinguishable from being lost. -->
        <p v-if="arrivedFromAdd" class="intro__reason">{{ t("profile.setup.reason.add") }}</p>
      </div>

      <form class="form" @submit.prevent="save">
        <Field
          v-model="displayName"
          :label="t('profile.name.label')"
          :placeholder="t('profile.name.placeholder')"
          :error="nameError"
          required
        />
        <HandleField
          v-model="typedHandle"
          :label="t('profile.handle.label')"
          :preview="handlePreview"
          :frozen="frozenHandle"
          :hint="t('profile.handle.hint')"
          :frozen-hint="t('profile.handle.frozen')"
          :verdict="handleNote"
          :tone="handleTone"
          :invalid="handleUnusable"
        />
        <Field
          v-model="whatsapp"
          :label="t('profile.whatsapp.label')"
          :placeholder="t('profile.whatsapp.placeholder')"
          :error="whatsappError"
          type="tel"
          required
        />
        <Field
          v-model="locationText"
          :label="t('profile.location.label')"
          :error="locationError"
          required
        />

        <h3 class="section">{{ t("profile.social.heading") }}</h3>
        <Field v-model="facebook" label="Facebook" type="url" />
        <Field v-model="instagram" label="Instagram" type="url" />
        <Field v-model="tiktok" label="TikTok" type="url" />

        <p v-if="formError" class="error">{{ formError }}</p>
        <Button type="submit" :loading="saving">{{ t("profile.save") }}</Button>
      </form>
    </template>

    <!-- A kind this screen has no case for renders the fault display, which is what states.md
         demands of an undesigned state — never the form, which would photograph a refusal as a
         screen that is ready. -->
    <FaultRendition v-else @retry="start" />
  </section>
</template>

<style scoped>
.account-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
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
.intro__reason {
  margin: 0;
  font-size: 13px;
  color: var(--brown-mid);
  max-width: 36ch;
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
