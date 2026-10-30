<script setup lang="ts">
import { useI18n } from "vue-i18n";
import CookRow from "../../../../components/present/CookRow.vue";
import type { Meal } from "../../../../types/schemas";
import Button from "../../../../ui/adaptive/Button.vue";
import Card from "../../../../ui/adaptive/Card.vue";
import PhotoSlider from "../../components/PhotoSlider.vue";

// The opened meal: its photographs, its facts, its cook, and the two things a reader can do
// about it. Props in, events out — it does not know the meal came from a request, that a save
// is a journal write, or that WhatsApp may be missing; the View above it owns all three and
// passes down what it decided.
defineProps<{
  meal: Meal;
  slides: string[];
  saved: boolean;
  waMissing: boolean;
  priceLabel: string;
}>();
defineEmits<{ contact: []; toggle: [] }>();
const { t } = useI18n();
</script>

<template>
  <PhotoSlider :slides="slides" :alt="meal.title" />

  <Card>
    <h2 class="title">{{ meal.title }}</h2>
    <p class="desc">{{ meal.description }}</p>
    <div class="pills">
      <span v-if="priceLabel" class="pill">{{ priceLabel }}</span>
      <span v-if="meal.delivery_option === 'delivery'" class="pill">{{ t("meal.delivery") }}</span>
      <span v-else-if="meal.delivery_option === 'pickup'" class="pill">{{
        t("add.delivery.pickup")
      }}</span>
    </div>
  </Card>

  <Card v-if="meal.quantity || meal.available_time || meal.location_text">
    <h3 class="section">{{ t("meal.details.heading") }}</h3>
    <dl class="facts">
      <template v-if="meal.quantity">
        <dt>{{ t("meal.quantity", { n: meal.quantity }) }}</dt>
        <dd />
      </template>
      <template v-if="meal.available_time">
        <dt>{{ t("meal.availableTime") }}</dt>
        <dd>{{ meal.available_time }}</dd>
      </template>
      <template v-if="meal.location_text">
        <dt>{{ t("add.location.label") }}</dt>
        <dd>{{ meal.location_text }}</dd>
      </template>
    </dl>
  </Card>

  <Card>
    <CookRow :meal="meal" />
  </Card>

  <div class="actions">
    <Button @click="$emit('contact')">{{ t("meal.cta.whatsapp") }}</Button>
    <Button variant="secondary" @click="$emit('toggle')">
      {{ saved ? t("meal.saved") : t("meal.save") }}
    </Button>
  </div>
  <p v-if="waMissing" class="warn">{{ t("error.wa.missing") }}</p>
</template>

<style scoped>
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
