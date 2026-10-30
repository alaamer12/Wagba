<script setup lang="ts">
import { useI18n } from "vue-i18n";
import EmptyNotice from "../../shared/components/EmptyNotice.vue";
import Button from "../adaptive/Button.vue";

// `fault`: a read failed and there is nothing to show. The wording says "we could not ask",
// never "there is none" — states.md keeps those two kinds apart, and one place words it.
const { t } = useI18n();
defineEmits<{ retry: [] }>();
</script>

<template>
  <EmptyNotice :title="t('error.fault.title')" :body="t('error.fault.body')">
    <Button @click="$emit('retry')">{{ t("common.retry") }}</Button>
  </EmptyNotice>
</template>
