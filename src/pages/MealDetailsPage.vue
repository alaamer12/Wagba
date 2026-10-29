<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import AppButton from "../components/base/AppButton.vue";
import AppCard from "../components/base/AppCard.vue";
import AppEmpty from "../components/base/AppEmpty.vue";
import AppSkeleton from "../components/base/AppSkeleton.vue";
import AppBar from "../components/layout/AppBar.vue";
import AppRegion from "../components/layout/AppRegion.vue";
import PageShell from "../components/layout/PageShell.vue";
import CookRow from "../components/present/CookRow.vue";
import { useWhatsApp } from "../composables/useWhatsApp";
import { getMeal, photoUrl } from "../services/meals";
import { useFavoritesStore } from "../stores/favorites";
import type { Kind } from "../stores/region";
import { AppError } from "../types/errors";
import type { Meal } from "../types/schemas";

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const whatsapp = useWhatsApp();
const favorites = useFavoritesStore();

const meal = ref<Meal | null>(null);
const kind = ref<Kind>("loading");
const saved = ref(false);
const waMissing = ref(false);

async function load() {
  kind.value = "loading";
  try {
    meal.value = await getMeal(String(route.params.id));
    kind.value = "ready";
  } catch (err) {
    kind.value = err instanceof AppError && err.code === "MEAL_GONE" ? "empty" : "fault";
  }
}

async function toggleSave() {
  if (!meal.value) return;
  saved.value = await favorites.toggle(meal.value.id);
}

async function contact() {
  if (!meal.value) return;
  const result = await whatsapp.open(
    meal.value.cook.whatsapp ?? "",
    `${t("meal.cta.whatsapp")} — ${meal.value.title}`,
  );
  waMissing.value = result === "missing";
}

const hero = computed(() =>
  meal.value?.photos[0] ? photoUrl(meal.value, meal.value.photos[0]) : "",
);
const priceLabel = computed(() =>
  meal.value?.price ? `${meal.value.price} ${locale.value === "ar" ? "جنيه" : "EGP"}` : "",
);

onMounted(async () => {
  await load();
  if (favorites.loaded) saved.value = meal.value ? favorites.has(meal.value.id) : false;
});
</script>

<template>
  <PageShell :with-bar="false">
    <template #bar>
      <AppBar :title="meal?.title ?? ''" back />
    </template>

    <AppRegion :kind="kind">
      <template #ready>
        <div v-if="hero" class="hero">
          <img :src="hero" :alt="meal?.title" />
        </div>

        <AppCard>
          <h2 class="title">{{ meal?.title }}</h2>
          <p class="desc">{{ meal?.description }}</p>
          <div class="pills">
            <span v-if="priceLabel" class="pill">{{ priceLabel }}</span>
            <span v-if="meal?.delivery_option === 'delivery'" class="pill">{{ t('meal.delivery') }}</span>
            <span v-else-if="meal?.delivery_option === 'pickup'" class="pill">{{ t('add.delivery.pickup') }}</span>
          </div>
        </AppCard>

        <AppCard v-if="meal?.quantity || meal?.available_time || meal?.location_text">
          <h3 class="section">{{ t('meal.details.heading') }}</h3>
          <dl class="facts">
            <template v-if="meal?.quantity">
              <dt>{{ t('meal.quantity', { n: meal.quantity }) }}</dt>
              <dd />
            </template>
            <template v-if="meal?.available_time">
              <dt>{{ t('meal.availableTime') }}</dt>
              <dd>{{ meal.available_time }}</dd>
            </template>
            <template v-if="meal?.location_text">
              <dt>{{ t('add.location.label') }}</dt>
              <dd>{{ meal.location_text }}</dd>
            </template>
          </dl>
        </AppCard>

        <AppCard v-if="meal">
          <CookRow :meal="meal" />
        </AppCard>

        <div class="actions">
          <AppButton @click="contact">{{ t('meal.cta.whatsapp') }}</AppButton>
          <AppButton variant="secondary" @click="toggleSave">{{ saved ? t('meal.saved') : t('meal.save') }}</AppButton>
        </div>
        <p v-if="waMissing" class="warn">{{ t('error.wa.missing') }}</p>
      </template>

      <template #loading>
        <AppSkeleton :rows="3" />
      </template>

      <template #empty>
        <AppEmpty :title="t('meal.gone')">
          <AppButton @click="router.push({ name: 'home' })">{{ t('common.back') }}</AppButton>
        </AppEmpty>
      </template>

      <template #fault>
        <AppEmpty :title="t('error.fault.title')" :body="t('error.fault.body')">
          <AppButton @click="load">{{ t('common.retry') }}</AppButton>
        </AppEmpty>
      </template>
    </AppRegion>
  </PageShell>
</template>

<style scoped>
.hero {
  border-radius: var(--radius-card);
  overflow: hidden;
  background: var(--cream);
}
.hero img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  display: block;
}
.title {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 800;
}
.desc {
  margin: 0;
  color: var(--brown-mid);
  font-size: 14px;
  line-height: 1.7;
}
.pills {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.pill {
  font-size: 12px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: var(--radius-pill);
  background: var(--butter-soft);
}
.section {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 800;
}
.facts {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 12px;
  margin: 0;
  font-size: 14px;
}
.facts dt {
  color: var(--brown-mid);
}
.facts dd {
  margin: 0;
  font-weight: 600;
}
.actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.warn {
  color: var(--danger);
  font-size: 13px;
  text-align: center;
  margin: 0;
}
</style>
