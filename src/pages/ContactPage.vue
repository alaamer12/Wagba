<script setup lang="ts">
import { useI18n } from "vue-i18n";
import AppButton from "../components/base/AppButton.vue";
import AppBar from "../components/layout/AppBar.vue";
import PageShell from "../components/layout/PageShell.vue";
import { useWhatsApp } from "../composables/useWhatsApp";
import { SUPPORT_WHATSAPP } from "../config";

const { t } = useI18n();
const whatsapp = useWhatsApp();
const configured = SUPPORT_WHATSAPP.trim().length > 0;

function contactSupport() {
  void whatsapp.open(SUPPORT_WHATSAPP, t("contact.title"));
}
</script>

<template>
  <PageShell :with-bar="false">
    <template #bar>
      <AppBar :title="t('contact.title')" back />
    </template>

    <p class="body">{{ t('contact.body') }}</p>

    <AppButton v-if="configured" :block="false" class="cta" @click="contactSupport">
      {{ t('contact.whatsapp') }}
    </AppButton>
    <p v-else class="none">{{ t('contact.none') }}</p>
  </PageShell>
</template>

<style scoped>
.body {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  color: var(--brown-mid);
  max-width: 40ch;
}
.cta {
  align-self: flex-start;
}
.none {
  margin: 0;
  font-size: 13px;
  color: var(--brown-mid);
  font-weight: 700;
}
</style>
