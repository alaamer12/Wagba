<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import AppBar from "../app/_AppBar.vue";
import PageShell from "../app/_PageShell.vue";
import AppRegion from "../components/layout/AppRegion.vue";
import CookRow from "../components/present/CookRow.vue";
import { useWhatsApp } from "../composables/useWhatsApp";
import type { Kind } from "../lib/region";
import { getMeal, photoUrl } from "../services/meals";
import EmptyNotice from "../shared/components/EmptyNotice.vue";
import { useFavoritesState } from "../shared/state/useFavoritesState";
import { useSessionState } from "../shared/state/useSessionState";
import { AppError } from "../types/errors";
import type { Meal } from "../types/schemas";
import Button from "../ui/adaptive/Button.vue";
import Card from "../ui/adaptive/Card.vue";
import Skeleton from "../ui/adaptive/Skeleton.vue";

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const whatsapp = useWhatsApp();
const favorites = useFavoritesState();
const session = useSessionState();

const meal = ref<Meal | null>(null);
const kind = ref<Kind>("loading");
// Membership is read from the journal, never mirrored into a local flag: a copy seeded
// "only if loaded" showed a saved meal as unsaved for the whole visit after a cold start.
const saved = computed(() => (meal.value ? favorites.has(meal.value.id) : false));
const waMissing = ref(false);
const slides = ref<HTMLImageElement[]>([]);
const gallery = computed(() =>
  meal.value ? meal.value.photos.map((name) => photoUrl(meal.value as Meal, name)) : [],
);

function goTo(index: number) {
  slides.value[index]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}

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
  await session.ensureReady();
  await favorites.toggle(meal.value.id);
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
  // A journal that cannot be read is a background failure: the meal still opens, and the
  // toggle the user actually presses reports its own error.
  await favorites.ensureLoaded().catch(() => {});
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
          <div class="slider" :class="{ 'is-multi': gallery.length > 1 }">
            <img
              v-for="(src, index) in gallery"
              :key="src"
              :ref="(el) => { if (el) slides[index] = el as HTMLImageElement }"
              :src="src"
              :alt="meal?.title"
              class="slide"
            />
          </div>
          <div v-if="gallery.length > 1" class="dots">
            <button
              v-for="(src, index) in gallery"
              :key="`dot-${src}`"
              type="button"
              class="dot"
              :aria-label="`${index + 1} / ${gallery.length}`"
              @click="goTo(index)"
            />
          </div>
        </div>

        <Card>
          <h2 class="title">{{ meal?.title }}</h2>
          <p class="desc">{{ meal?.description }}</p>
          <div class="pills">
            <span v-if="priceLabel" class="pill">{{ priceLabel }}</span>
            <span v-if="meal?.delivery_option === 'delivery'" class="pill">{{ t('meal.delivery') }}</span>
            <span v-else-if="meal?.delivery_option === 'pickup'" class="pill">{{ t('add.delivery.pickup') }}</span>
          </div>
        </Card>

        <Card v-if="meal?.quantity || meal?.available_time || meal?.location_text">
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
        </Card>

        <Card v-if="meal">
          <CookRow :meal="meal" />
        </Card>

        <div class="actions">
          <Button @click="contact">{{ t('meal.cta.whatsapp') }}</Button>
          <Button variant="secondary" @click="toggleSave">{{ saved ? t('meal.saved') : t('meal.save') }}</Button>
        </div>
        <p v-if="waMissing" class="warn">{{ t('error.wa.missing') }}</p>
      </template>

      <template #loading>
        <Skeleton :rows="3" />
      </template>

      <template #empty>
        <EmptyNotice :title="t('meal.gone')">
          <Button @click="router.push({ name: 'home' })">{{ t('common.back') }}</Button>
        </EmptyNotice>
      </template>

      <template #fault>
        <EmptyNotice :title="t('error.fault.title')" :body="t('error.fault.body')">
          <Button @click="load">{{ t('common.retry') }}</Button>
        </EmptyNotice>
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
.slider {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}
.slider::-webkit-scrollbar {
  display: none;
}
.slide {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  display: block;
  flex: 0 0 100%;
  scroll-snap-align: center;
}
.dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: 8px 0;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: none;
  background: var(--border);
  cursor: pointer;
  padding: 0;
}
.dot:focus-visible {
  outline: 2px solid var(--butter);
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
