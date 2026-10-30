<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useSessionState } from "../../../../shared/state/useSessionState";
import Button from "../../../../ui/adaptive/Button.vue";
import Card from "../../../../ui/adaptive/Card.vue";

// The incomplete half of the account region: what a brand-new device is offered instead of an
// empty summary, and nothing at all once the profile carries a name, a handle and a number.
//
// `AccountCardView` holds the mirror of this condition. The two are separate Views rather than
// one View with two renditions because each owns a different question — who am I, and what must
// I do next — and only the second one carries an action.
const { t } = useI18n();
const router = useRouter();
const session = useSessionState();

const complete = computed(() => session.isComplete);

// The screen used to await the account before drawing any of it; each half keeps that promise
// for itself (`boot` is idempotent, so the three waiters share one provisioning attempt).
onMounted(async () => {
  await session.ensureReady();
});
</script>

<template>
  <Card v-if="!complete" class="welcome">
    <h2 class="welcome__title">{{ t('settings.account.incomplete.title') }}</h2>
    <p class="welcome__body">{{ t('settings.account.incomplete.body') }}</p>
    <Button :block="false" @click="router.push({ name: 'add-meal' })">
      {{ t('settings.account.incomplete.cta') }}
    </Button>
  </Card>
</template>

<style scoped>
.welcome {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: flex-start;
}
.welcome__title {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
}
.welcome__body {
  margin: 0;
  font-size: 13px;
  color: var(--brown-mid);
  line-height: 1.7;
}
</style>
