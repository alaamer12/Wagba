<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import AppButton from "../components/base/AppButton.vue";
import AppField from "../components/base/AppField.vue";
import AppBar from "../components/layout/AppBar.vue";
import PageShell from "../components/layout/PageShell.vue";
import { usePhotoPicker } from "../composables/usePhotoPicker";
import { publishMeal } from "../services/meals";
import { useLocationStore } from "../stores/location";
import { useSessionStore } from "../stores/session";
import { AppError, toAppError } from "../types/errors";

const { t } = useI18n();
const router = useRouter();
const session = useSessionStore();
const location = useLocationStore();
const picker = usePhotoPicker();

const title = ref("");
const description = ref("");
const price = ref("");
const quantity = ref("");
const availableTime = ref("");
const delivery = ref<"pickup" | "delivery">("pickup");
const locationText = ref(session.profile?.location_text ?? "");
const photos = ref<File[]>([]);
const error = ref("");
const submitting = ref(false);
const blocked = ref(false);

async function onFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  try {
    photos.value = await picker.prepare(picker.validate(files, photos.value.length));
    error.value = "";
  } catch (err) {
    error.value =
      err instanceof AppError && err.code === "PHOTO_LIMIT"
        ? t("error.photo.limit")
        : t("error.photo.tooLarge");
  }
  input.value = "";
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
    if (!center) {
      blocked.value = true;
      return;
    }
    await publishMeal({
      title: title.value.trim(),
      description: description.value.trim(),
      price: price.value ? Number(price.value) : null,
      quantity: quantity.value ? Number(quantity.value) : null,
      delivery: delivery.value,
      availableTime: availableTime.value.trim(),
      locationText: locationText.value.trim(),
      location: center,
      photos: photos.value,
    });
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

onMounted(async () => {
  if (!session.isComplete) {
    router.replace({ name: "profile-setup", query: { from: "add-meal" } });
    return;
  }
  const center = await location.ensure();
  blocked.value = !center;
});
</script>

<template>
  <PageShell :with-bar="false">
    <template #bar>
      <AppBar :title="t('add.title')" back />
    </template>

    <form class="form" @submit.prevent="publish">
      <div class="upload">
        <label class="upload__label" for="photos">{{ t('add.photos.title') }}</label>
        <input id="photos" type="file" accept="image/*" multiple @change="onFiles" />
        <p class="upload__hint">{{ t('add.photos.hint') }}</p>
        <p v-if="photos.length" class="upload__count">{{ photos.length }}</p>
      </div>

      <AppField v-model="title" :label="t('add.name.label')" :placeholder="t('add.name.placeholder')" required />
      <AppField v-model="description" :label="t('add.description.label')" :hint="t('add.description.optional')" multiline />
      <AppField v-model="price" :label="t('add.price.label')" :placeholder="t('add.price.placeholder')" type="number" />
      <AppField v-model="quantity" :label="t('add.quantity.label')" type="number" />
      <AppField v-model="availableTime" :label="t('add.availability.label')" />

      <fieldset class="radio">
        <legend>{{ t('add.delivery.label') }}</legend>
        <label><input v-model="delivery" type="radio" value="pickup" /> {{ t('add.delivery.pickup') }}</label>
        <label><input v-model="delivery" type="radio" value="delivery" /> {{ t('add.delivery.available') }}</label>
      </fieldset>

      <AppField v-model="locationText" :label="t('add.location.label')" :hint="t('add.location.hint')" :placeholder="t('add.location.placeholder')" required />

      <p v-if="blocked" class="error">{{ t('error.location.title') }} — {{ t('error.location.body') }}</p>
      <p v-else-if="error" class="error">{{ error }}</p>

      <AppButton type="submit" :loading="submitting" :disabled="blocked">{{ t('add.publish') }}</AppButton>
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
  gap: 4px;
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
.upload__count {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
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
