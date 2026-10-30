<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { type Kind, resolveRegion } from "../../../../lib/region";
import { deleteMeal } from "../../../../services/meals";
import { useForcedRegionCondition } from "../../../../shared/conditions/useForcedRegionCondition";
import type { Meal } from "../../../../types/schemas";
import Button from "../../../../ui/adaptive/Button.vue";

// The confirmation before a meal is gone for good. It is a View because the delete is *its*
// work: the question is asked once and the two kinds that can follow — the write in flight,
// the write refused — are facts about that request, held nowhere else. The list keeps the rows;
// this only reports which id the server agreed to remove.
const props = defineProps<{ meal: Meal | null }>();
const emit = defineEmits<{ deleted: [id: string]; cancel: [] }>();
const { t } = useI18n();
const { forced } = useForcedRegionCondition();

const submitting = ref(false);
const rejected = ref(false);

const kind = computed<Kind>(() => {
  const override = forced.value;
  if (override?.facts) return resolveRegion(override.facts);
  if (override) return override.kind;
  // The question is on screen because something answered it — the meal is real and known — so
  // the read is true by construction, and only our own write moves the ladder from here.
  return resolveRegion({
    read: true,
    hasRows: true,
    submitting: submitting.value,
    rejected: rejected.value,
  });
});

async function remove() {
  const meal = props.meal;
  if (!meal) return;
  submitting.value = true;
  rejected.value = false;
  try {
    await deleteMeal(meal.id);
    emit("deleted", meal.id);
  } catch {
    // A refused delete used to look like a cancel: the spinner stopped and nothing said why.
    rejected.value = true;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div
    v-if="meal"
    :data-kind="kind"
    class="overlay"
    role="dialog"
    aria-modal="true"
    :aria-label="t('meal.delete.title')"
  >
    <div class="dialog">
      <h2 class="dialog__title">{{ t("meal.delete.title") }}</h2>
      <p class="dialog__body">{{ t("meal.delete.body") }}</p>
      <p v-if="kind === 'rejected'" class="dialog__error">{{ t("error.fault.body") }}</p>
      <div class="dialog__actions">
        <Button :block="false" :loading="kind === 'submitting'" @click="remove">
          {{ t("common.confirm") }}
        </Button>
        <Button :block="false" variant="ghost" @click="emit('cancel')">
          {{ t("common.cancel") }}
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgb(63 34 5 / 45%);
  display: grid;
  place-items: center;
  padding: var(--space-4);
  z-index: 20;
}
.dialog {
  width: min(320px, 100%);
  background: var(--surface);
  border-radius: var(--radius-card);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  box-shadow: var(--shadow-soft);
}
.dialog__title {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
}
.dialog__body {
  margin: 0;
  font-size: 13px;
  color: var(--brown-mid);
}
.dialog__error {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--brown-mid);
}
.dialog__actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
</style>
