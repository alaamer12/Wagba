<script setup lang="ts">
import { useI18n } from "vue-i18n";
import EmptyNotice from "../../../../shared/components/EmptyNotice.vue";
import Button from "../../../../ui/adaptive/Button.vue";

// The meal is no longer published. This is `empty` with a reason: the answer arrived and said
// "gone", which is not the same claim as `fault` and must not read like one.
const { t } = useI18n();
defineEmits<{ back: [] }>();
</script>

<template>
  <EmptyNotice :title="t('meal.gone')">
    <Button @click="$emit('back')">{{ t("common.back") }}</Button>
  </EmptyNotice>
</template>
