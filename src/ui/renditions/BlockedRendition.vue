<script setup lang="ts">
import { useI18n } from "vue-i18n";
import EmptyNotice from "../../shared/components/EmptyNotice.vue";
import Button from "../adaptive/Button.vue";

// `blocked`: the session cannot proceed because something the device owns says no — a
// permission refused, a sensor unavailable. It is not a fault, because retrying the request
// changes nothing; the user has to change the setting first, and the copy names that.
const { t } = useI18n();
withDefaults(defineProps<{ retryable?: boolean }>(), { retryable: true });
defineEmits<{ retry: [] }>();
</script>

<template>
  <EmptyNotice :title="t('error.location.title')" :body="t('error.location.body')">
    <!-- A refusal is terminal: the button would ask the same sensor that already said no. Only a
         transient failure (timeout, no hardware) offers another attempt. -->
    <Button v-if="retryable" @click="$emit('retry')">{{ t("error.location.retry") }}</Button>
  </EmptyNotice>
</template>
