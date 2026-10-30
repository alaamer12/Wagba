<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Skeleton from "../adaptive/Skeleton.vue";

// The `loading` answer for any region in the app: the card-shaped shimmer plus the line a
// screen reader hears. The skeleton itself is aria-hidden, so without this an assistive
// user gets no signal at all that work is happening.
withDefaults(defineProps<{ rows?: number }>(), { rows: 3 });
const { t } = useI18n();
</script>

<template>
  <div role="status" class="loading">
    <span class="loading__say">{{ t("state.loading") }}</span>
    <Skeleton :rows="rows" />
  </div>
</template>

<style scoped>
.loading {
  display: flex;
  flex-direction: column;
}
.loading__say {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
