<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import AppBar from "../app/_AppBar.vue";
import PageShell from "../app/_PageShell.vue";
import { usePhotoPicker } from "../composables/usePhotoPicker";
import { getMeal, publishMeal, updateMeal } from "../services/meals";
import { fileUrl } from "../services/pb";
import { useLocationState } from "../shared/state/useLocationState";
import { useSessionState } from "../shared/state/useSessionState";
import { AppError, toAppError } from "../types/errors";
import Button from "../ui/adaptive/Button.vue";
import Field from "../ui/adaptive/Field.vue";
import LoadingRendition from "../ui/renditions/LoadingRendition.vue";

type PhotoItem =
  | { id: string; kind: "existing"; name: string; url: string }
  | { id: string; kind: "new"; file: File; url: string };

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const session = useSessionState();
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
const delivery = ref<"pickup" | "delivery">("pickup");
const locationText = ref(session.profile?.location_text ?? "");
const photos = ref<PhotoItem[]>([]);
const error = ref("");
const submitting = ref(false);
// An edit form whose values have not arrived yet is not a form the user may fill: typing
// into it worked, then `loadForEdit` overwrote every field with the record it was still
// fetching. The save resolved with the old title and the app navigated as if it had stored
// the new one — only measurable because the e2e run under load typed faster than the fetch.
const ready = ref(!editing.value);
// Denied is the device's answer, read from the location state — not a local flag this
// page writes after trying, which is how the same fact came to have two owners.
const blocked = computed(() => location.blocked);

function addItems(files: File[]): PhotoItem[] {
  return files.map((file, index) => ({
    id: `${Date.now()}-${index}-${file.name}`,
    kind: "new" as const,
    file,
    url: URL.createObjectURL(file),
  }));
}

async function onFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  try {
    const allowed = picker.validate(files, photos.value.length);
    photos.value = [...photos.value, ...addItems(await picker.prepare(allowed))];
    error.value = "";
  } catch (err) {
    error.value =
      err instanceof AppError && err.code === "PHOTO_LIMIT"
        ? t("error.photo.limit")
        : err instanceof AppError && err.code === "PHOTO_WRONG_TYPE"
          ? t("error.photo.wrongType")
          : t("error.photo.tooLarge");
  }
  input.value = "";
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
  error.value = "";
  if (!title.value.trim()) {
    error.value = t("error.field.required", { field: t("add.name.label") });
    return;
  }
  if (!locationText.value.trim()) {
    error.value = t("error.field.required", { field: t("add.location.label") });
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
    router.replace({ name: "home" });
  } catch (err) {
    error.value =
      toAppError(err).code === "NET_UNREACHABLE"
        ? t("error.offline.body")
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
      error.value = t("error.fault.body");
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
  <PageShell :with-bar="false">
    <template #bar>
      <AppBar :title="editing ? t('add.editTitle') : t('add.title')" back />
    </template>

    <LoadingRendition v-if="!ready" :rows="4" />
    <form v-else class="form" @submit.prevent="publish">
      <div class="upload">
        <span class="upload__label">{{ t("add.photos.title") }}</span>
        <div v-if="photos.length" class="grid">
          <figure v-for="(photo, index) in photos" :key="photo.id" class="photo">
            <img :src="photo.url" alt="" />
            <figcaption v-if="index === 0" class="photo__cover">{{ t("add.photos.cover") }}</figcaption>
            <div class="photo__actions">
              <button
                type="button"
                :disabled="index === 0"
                :aria-label="t('add.photos.moveUp')"
                @click="move(index, -1)"
              >
                ↑
              </button>
              <button
                type="button"
                :disabled="index === photos.length - 1"
                :aria-label="t('add.photos.moveDown')"
                @click="move(index, 1)"
              >
                ↓
              </button>
              <button type="button" :aria-label="t('add.photos.remove')" @click="removePhoto(index)">
                ✕
              </button>
            </div>
          </figure>
        </div>
        <label v-if="photos.length < 5" class="upload__add">
          <input id="photos" type="file" accept="image/*" multiple @change="onFiles" />
          <span>{{ t("add.photos.add") }}</span>
        </label>
        <p class="upload__hint">{{ t("add.photos.hint") }}</p>
      </div>

      <Field v-model="title" :label="t('add.name.label')" :placeholder="t('add.name.placeholder')" required />
      <Field v-model="description" :label="t('add.description.label')" :hint="t('add.description.optional')" multiline />
      <Field v-model="price" :label="t('add.price.label')" :placeholder="t('add.price.placeholder')" type="number" />
      <Field v-model="quantity" :label="t('add.quantity.label')" type="number" />
      <Field v-model="availableTime" :label="t('add.availability.label')" />

      <fieldset class="radio">
        <legend>{{ t("add.delivery.label") }}</legend>
        <label><input v-model="delivery" type="radio" value="pickup" /> {{ t("add.delivery.pickup") }}</label>
        <label><input v-model="delivery" type="radio" value="delivery" /> {{ t("add.delivery.available") }}</label>
      </fieldset>

      <Field v-model="locationText" :label="t('add.location.label')" :hint="t('add.location.hint')" :placeholder="t('add.location.placeholder')" required />

      <p v-if="blocked" class="error">{{ t("error.location.title") }} — {{ t("error.location.body") }}</p>
      <p v-else-if="error" class="error">{{ error }}</p>

      <Button type="submit" :loading="submitting" :disabled="blocked">{{ t("add.publish") }}</Button>
    </form>
  </PageShell>
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
.upload__add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px dashed var(--border);
  border-radius: var(--radius-field);
  padding: 14px;
  color: var(--brown-mid);
  font-size: 14px;
  cursor: pointer;
}
.upload__add input {
  display: none;
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
.photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
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
.photo__actions {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  gap: 4px;
  padding: 4px;
  background: rgb(63 34 5 / 55%);
}
.photo__actions button {
  border: none;
  background: transparent;
  color: #fff;
  font-size: 13px;
  line-height: 1;
  padding: 4px 6px;
  cursor: pointer;
}
.photo__actions button:disabled {
  opacity: 0.35;
  cursor: default;
}
.radio {
  border: 1px solid var(--border);
  border-radius: var(--radius-field);
  padding: 10px 14px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 14px;
}
.radio legend {
  font-size: 13px;
  color: var(--brown-mid);
  padding: 0 4px;
}
.error {
  color: var(--danger);
  font-size: 13px;
  margin: 0;
}
</style>
