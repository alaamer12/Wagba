<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import AppBar from "../../../../app/_AppBar.vue";
import { usePhotoPicker } from "../../../../composables/usePhotoPicker";
import { getMeal, publishMeal, updateMeal } from "../../../../services/meals";
import { fileUrl } from "../../../../services/pb";
import { useLocationState } from "../../../../shared/state/useLocationState";
import { useMealFeedState } from "../../../../shared/state/useMealFeedState";
import { useSessionState } from "../../../../shared/state/useSessionState";
import { AppError, toAppError } from "../../../../types/errors";
import Button from "../../../../ui/adaptive/Button.vue";
import ChoiceGroup from "../../../../ui/adaptive/ChoiceGroup.vue";
import Field from "../../../../ui/adaptive/Field.vue";
import FileInput from "../../../../ui/adaptive/FileInput.vue";
import Photo from "../../../../ui/adaptive/Photo.vue";
import FaultRendition from "../../../../ui/renditions/FaultRendition.vue";
import LoadingRendition from "../../../../ui/renditions/LoadingRendition.vue";
import {
  issuesByField,
  MAX_PHOTOS,
  type MealField,
  type MealIssueReason,
  mealIssues,
  photoIssue,
} from "./mealFormRules";

type PhotoItem =
  | { id: string; kind: "existing"; name: string; url: string }
  | { id: string; kind: "new"; file: File; url: string };

// Publishing a meal, and editing one. The View owns the bar because its title says which of the
// two this is.
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const session = useSessionState();
const feed = useMealFeedState();
const location = useLocationState();
const picker = usePhotoPicker();

const editingId = computed(() =>
  typeof route.params.id === "string" && route.params.id.length > 0 ? route.params.id : "",
);
const editing = computed(() => editingId.value.length > 0);

const title = ref("");
const description = ref("");
const price = ref("");
const quantity = ref("");
const availableTime = ref("");
type Delivery = "pickup" | "delivery";
const delivery = ref<Delivery>("pickup");
// The labels are read through `t` inside a computed: a literal built once at setup would keep the
// language it was mounted in while the rest of the form switched.
const deliveryOptions = computed(
  (): Array<{ value: Delivery; label: string }> => [
    { value: "pickup", label: t("add.delivery.pickup") },
    { value: "delivery", label: t("add.delivery.available") },
  ],
);
const locationText = ref(session.profile?.location_text ?? "");
const photos = ref<PhotoItem[]>([]);
// The hidden file control: the control can only be opened from its own platform element, so the
// View holds it and the visible "add" Button asks it to open.
const photoPicker = ref<{ open: () => void } | null>(null);
// C10: one message per field, rendered on the field it names. Every required check used to
// collapse into a single line under the button, so a cook who missed the location was told
// nothing about the location, and `Field`'s own `error` prop was never bound at all.
const fieldErrors = ref<Partial<Record<MealField, string>>>({});
// The uploader is not a `Field`, so its verdict is this View's own line, under the grid.
const photoError = ref("");
// The one line that names no control: the server's verdict on the last attempt. `error-ux.md`
// keeps `PUBLISH_REJECTED` inline and says the form keeps its contents — a form that fails with
// nothing on screen teaches the person to press the button twice.
const formError = ref("");
const loadFailed = ref(false);
const submitting = ref(false);
// An edit form whose values have not arrived yet is not a form the user may fill: typing into
// it worked, then the load overwrote every field with the record it was still fetching (F46).
const ready = ref(!editing.value);
// Denied is the device's answer, read from the location state — not a local flag this unit
// writes after trying, which is how the same fact came to have two owners.
const blocked = computed(() => location.blocked);

function addItems(files: File[]): PhotoItem[] {
  return files.map((file, index) => ({
    id: `${Date.now()}-${index}-${file.name}`,
    kind: "new" as const,
    file,
    url: URL.createObjectURL(file),
  }));
}

// Which words a field is labelled with, so a required-message names the field the person sees
// rather than the key the schema calls it.
const FIELD_LABEL: Record<MealField, string> = {
  title: "add.name.label",
  locationText: "add.location.label",
  price: "add.price.label",
  quantity: "add.quantity.label",
};

function issueMessage(field: MealField, reason: MealIssueReason): string {
  if (reason === "required") return t("error.field.required", { field: t(FIELD_LABEL[field]) });
  return reason === "whole" ? t("add.quantity.invalid") : t("add.price.invalid");
}

/** Every message the form's own rules produce right now, per field. */
function validateForm(): boolean {
  const issues = issuesByField(
    mealIssues({
      title: title.value,
      locationText: locationText.value,
      price: price.value,
      quantity: quantity.value,
    }),
  );
  const next: Partial<Record<MealField, string>> = {};
  for (const field of Object.keys(issues) as MealField[]) {
    const issue = issues[field];
    if (issue) next[field] = issueMessage(field, issue.reason);
  }
  fieldErrors.value = next;
  return Object.keys(next).length === 0;
}

function clearIssue(field: MealField) {
  if (!fieldErrors.value[field]) return;
  const next = { ...fieldErrors.value };
  delete next[field];
  fieldErrors.value = next;
}

// A message that outlives the correction it describes is a second opinion nobody asked for.
watch(title, () => clearIssue("title"));
watch(locationText, () => clearIssue("locationText"));
watch(price, () => clearIssue("price"));
watch(quantity, () => clearIssue("quantity"));

async function onFiles(files: File[]) {
  try {
    const allowed = picker.validate(files, photos.value.length);
    photos.value = [...photos.value, ...addItems(await picker.prepare(allowed))];
    photoError.value = "";
  } catch (err) {
    // Under the uploader, where the rejected file was chosen — not at the bottom of the form.
    photoError.value =
      err instanceof AppError && err.code === "PHOTO_LIMIT"
        ? t("error.photo.limit")
        : err instanceof AppError && err.code === "PHOTO_WRONG_TYPE"
          ? t("error.photo.wrongType")
          : t("error.photo.tooLarge");
  }
}

function removePhoto(index: number) {
  const [removed] = photos.value.splice(index, 1);
  if (removed?.kind === "new") URL.revokeObjectURL(removed.url);
}

function move(index: number, delta: number) {
  const next = index + delta;
  if (next < 0 || next >= photos.value.length) return;
  const list = photos.value;
  const current = list[index];
  const target = list[next];
  if (!current || !target) return;
  list[index] = target;
  list[next] = current;
}

async function publish() {
  formError.value = "";
  // A new attempt re-reads what is actually in the form. A verdict about a file that never
  // entered it belongs to that earlier attempt, not to this one.
  photoError.value = "";
  if (!validateForm()) return;
  const overLimit = photoIssue(photos.value.length);
  if (overLimit) {
    photoError.value = t("error.photo.limit");
    return;
  }
  submitting.value = true;
  try {
    const center = await location.ensure();
    if (!center) return;
    const input = {
      title: title.value.trim(),
      description: description.value.trim(),
      price: price.value ? Number(price.value) : null,
      quantity: quantity.value ? Number(quantity.value) : null,
      delivery: delivery.value,
      availableTime: availableTime.value.trim(),
      locationText: locationText.value.trim(),
      location: center,
    };
    if (editing.value) {
      const ordered = photos.value.map((photo) =>
        photo.kind === "existing" ? photo.name : photo.file,
      );
      await updateMeal(editingId.value, { ...input, photos: ordered });
    } else {
      const files = photos.value.flatMap((photo) => (photo.kind === "new" ? [photo.file] : []));
      await publishMeal({ ...input, photos: files });
    }
    // The request that produced this write is retired. `feed.refresh()` re-runs whatever the
    // feed last asked for, and after a first publish that would be *this submit* — with the
    // handle as typed before the freeze, which is the one field the server refuses to change
    // twice. The feed has to be re-read anyway: this meal is new content.
    feed.reset();
    router.replace({ name: "home" });
  } catch (err) {
    // The engine's field names never reach a person (`error-ux.md`), and `toAppError` is what
    // keeps that promise — so a refusal is placed by the code the service answered with, not by
    // the raw field it complained about. `MEAL_GONE` is the 404 an edit of a deleted meal gets,
    // and it names the meal, not a field: it used to read as "the meal was not posted. Try
    // again", which is an invitation to retry something that can never work.
    const code = toAppError(err).code;
    formError.value =
      code === "NET_UNREACHABLE"
        ? t("error.offline.body")
        : code === "MEAL_GONE"
          ? t("meal.gone")
          : t("error.publish.body");
  } finally {
    submitting.value = false;
  }
}

async function loadForEdit() {
  const meal = await getMeal(editingId.value);
  if (meal.user !== session.profile?.id) {
    await router.replace({ name: "home" });
    return;
  }
  title.value = meal.title;
  description.value = meal.description;
  price.value = meal.price != null ? String(meal.price) : "";
  quantity.value = meal.quantity != null ? String(meal.quantity) : "";
  availableTime.value = meal.available_time;
  delivery.value = meal.delivery_option === "delivery" ? "delivery" : "pickup";
  locationText.value = meal.location_text;
  photos.value = meal.photos.map((name, index) => ({
    id: `existing-${index}-${name}`,
    kind: "existing" as const,
    name,
    url: fileUrl(meal, name),
  }));
}

async function retryLoad() {
  loadFailed.value = false;
  ready.value = false;
  try {
    await loadForEdit();
  } catch {
    loadFailed.value = true;
  } finally {
    ready.value = true;
  }
}

onMounted(async () => {
  await session.ensureReady();
  if (!session.isComplete) {
    router.replace({ name: "profile-setup", query: { from: editing.value ? "home" : "add-meal" } });
    return;
  }
  if (editing.value) {
    try {
      await loadForEdit();
    } catch {
      loadFailed.value = true;
    } finally {
      ready.value = true;
    }
  }
  // Entry captures the fix the meal will be pinned to (screens.md §Add Meal); the panel
  // that appears when the device refuses is derived, not set here.
  void location.ensure();
});

onUnmounted(() => {
  for (const photo of photos.value) {
    if (photo.kind === "new") URL.revokeObjectURL(photo.url);
  }
});
</script>

<template>
  <AppBar :title="editing ? t('add.editTitle') : t('add.title')" back />

  <FaultRendition v-if="loadFailed" @retry="retryLoad" />
  <LoadingRendition v-else-if="!ready" :rows="4" />
  <form v-else class="form" @submit.prevent="publish">
    <div class="upload">
      <span class="upload__label">{{ t("add.photos.title") }}</span>
      <div v-if="photos.length" class="grid">
        <figure v-for="(photo, index) in photos" :key="photo.id" class="photo">
          <Photo :src="photo.url" alt="" :lazy="false" />
          <figcaption v-if="index === 0" class="photo__cover">{{ t("add.photos.cover") }}</figcaption>
          <div class="photo__actions">
            <Button
              variant="icon"
              :block="false"
              :disabled="index === 0"
              :aria-label="t('add.photos.moveUp')"
              @click="move(index, -1)"
            >
              ↑
            </Button>
            <Button
              variant="icon"
              :block="false"
              :disabled="index === photos.length - 1"
              :aria-label="t('add.photos.moveDown')"
              @click="move(index, 1)"
            >
              ↓
            </Button>
            <Button
              variant="icon"
              :block="false"
              :aria-label="t('add.photos.remove')"
              @click="removePhoto(index)"
            >
              ✕
            </Button>
          </div>
        </figure>
      </div>
      <FileInput
        v-if="photos.length < MAX_PHOTOS"
        id="photos"
        ref="photoPicker"
        accept="image/*"
        multiple
        @files="onFiles"
      />
      <Button
        v-if="photos.length < MAX_PHOTOS"
        variant="secondary"
        @click="photoPicker?.open()"
      >
        {{ t("add.photos.add") }}
      </Button>
      <p class="upload__hint">{{ t("add.photos.hint") }}</p>
      <p v-if="photoError" class="error">{{ photoError }}</p>
    </div>

    <Field
      v-model="title"
      :class="{ error: !!fieldErrors.title }"
      :label="t('add.name.label')"
      :placeholder="t('add.name.placeholder')"
      :error="fieldErrors.title ?? ''"
      required
    />
    <Field
      v-model="description"
      :label="t('add.description.label')"
      :hint="t('add.description.optional')"
      multiline
    />
    <Field
      v-model="price"
      :class="{ error: !!fieldErrors.price }"
      :label="t('add.price.label')"
      :placeholder="t('add.price.placeholder')"
      :error="fieldErrors.price ?? ''"
      type="number"
    />
    <Field
      v-model="quantity"
      :class="{ error: !!fieldErrors.quantity }"
      :label="t('add.quantity.label')"
      :error="fieldErrors.quantity ?? ''"
      type="number"
    />
    <Field v-model="availableTime" :label="t('add.availability.label')" />

    <ChoiceGroup
      v-model="delivery"
      :legend="t('add.delivery.label')"
      :options="deliveryOptions"
      name="delivery"
    />

    <Field
      v-model="locationText"
      :class="{ error: !!fieldErrors.locationText }"
      :label="t('add.location.label')"
      :hint="t('add.location.hint')"
      :placeholder="t('add.location.placeholder')"
      :error="fieldErrors.locationText ?? ''"
      required
    />

    <p v-if="blocked" class="notice">{{ t("error.location.title") }} — {{ t("error.location.body") }}</p>
    <p v-else-if="formError" class="error">{{ formError }}</p>

    <Button type="submit" :loading="submitting" :disabled="blocked">{{ t("add.publish") }}</Button>
  </form>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.upload {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.upload__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--brown-mid);
}
.upload__hint {
  margin: 0;
  font-size: 12px;
  color: var(--brown-mid);
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.photo {
  position: relative;
  margin: 0;
  aspect-ratio: 1;
  border-radius: var(--radius-field);
  overflow: hidden;
  background: var(--butter-soft);
}
.photo__cover {
  position: absolute;
  inset-inline-start: 6px;
  top: 6px;
  background: var(--butter);
  color: var(--ink);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}
/* Only the strip's own colour and type live here: the controls on it inherit both, so the seam
   keeps its own skin. */
.photo__actions {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  gap: 4px;
  padding: 4px;
  background: rgb(63 34 5 / 55%);
  color: #fff;
  font-size: 13px;
}
.error {
  color: var(--danger);
}
p.error {
  font-size: 13px;
  margin: 0;
}
/* The device's own refusal is a notice, not a fault in what the person typed. */
p.notice {
  color: var(--brown-mid);
  font-size: 13px;
  margin: 0;
}
</style>
