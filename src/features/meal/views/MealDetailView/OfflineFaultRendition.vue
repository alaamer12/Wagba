<script setup lang="ts">
import { useI18n } from "vue-i18n";
import EmptyNotice from "../../../../shared/components/EmptyNotice.vue";
import Button from "../../../../ui/adaptive/Button.vue";

// The read failed *and* the device cannot reach anything: the case stays the ladder's `fault`,
// but the words must not claim a problem with loading when the truth is that there is nothing
// to load from. Details caches nothing by decision (C13 keeps it network-free), so this notice
// says what is missing instead of pretending the rows are on their way. The copy is passed in
// because which sentence names the network is the View's fact to read, not this case's.
const { t } = useI18n();
withDefaults(defineProps<{ title: string; body?: string }>(), { body: "" });
defineEmits<{ retry: [] }>();
</script>

<template>
  <EmptyNotice :title="title" :body="body">
    <Button @click="$emit('retry')">{{ t("common.retry") }}</Button>
  </EmptyNotice>
</template>
