<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import BrandMark from "../../../../shared/decorations/BrandMark.vue";
import Button from "../../../../ui/adaptive/Button.vue";

// The first screen, and the one decision on it: press once and the app never shows it again.
// The View owns the redirect because the Page that mounted it has no route of its own to leave.
const { t } = useI18n();
const router = useRouter();

function start() {
  router.replace({ name: "home" });
}
</script>

<template>
  <div class="welcome">
    <BrandMark :size="44" />
    <p class="welcome__tagline">{{ t('welcome.tagline') }}</p>
    <img src="../../../../assets/brand/chef-hat.svg" alt="" class="welcome__illustration" />
    <Button class="welcome__cta" @click="start">{{ t('welcome.cta') }}</Button>
  </div>
</template>

<style scoped>
.welcome {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-6);
  background: var(--cream);
  text-align: center;
}
.welcome__tagline {
  font-size: 16px;
  color: var(--brown-mid);
  margin: 0;
}
.welcome__illustration {
  width: 96px;
  height: 96px;
  opacity: 0.85;
  margin: var(--space-4) 0;
}
.welcome__cta {
  max-width: 260px;
}
</style>
