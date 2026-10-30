<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import AppBar from "../app/_AppBar.vue";
import PageShell from "../app/_PageShell.vue";
import { useWhatsApp } from "../composables/useWhatsApp";
import { SUPPORT_WHATSAPP } from "../config";
import Button from "../ui/adaptive/Button.vue";

const { t } = useI18n();
const whatsapp = useWhatsApp();
const configured = SUPPORT_WHATSAPP.trim().length > 0;
// The handoff reports three outcomes; discarding the verdict told the user nothing when
// the app was simply not installed — the same screen's own answer already exists.
const unreachable = ref(false);

async function contactSupport() {
  unreachable.value = (await whatsapp.open(SUPPORT_WHATSAPP, t("contact.title"))) === "missing";
}
</script>

<template>
  <PageShell :with-bar="false">
    <template #bar>
      <AppBar :title="t('contact.title')" back />
    </template>

    <p class="body">{{ t('contact.body') }}</p>

    <Button v-if="configured" :block="false" class="cta" @click="contactSupport">
      {{ t('contact.whatsapp') }}
    </Button>
    <p v-if="unreachable" class="none">{{ t('error.wa.missing') }}</p>
    <p v-else-if="!configured" class="none">{{ t('contact.none') }}</p>
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
