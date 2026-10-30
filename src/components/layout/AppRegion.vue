<script setup lang="ts">
import { computed } from "vue";
import type { Kind } from "../../lib/region";

const props = defineProps<{ kind: Kind }>();
const slotName = computed(() => (props.kind === "unknown" ? "fault" : props.kind));
</script>

<template>
  <section :data-kind="kind" class="region">
    <slot v-if="kind === 'stale'" name="stale" />
    <slot :name="slotName">
      <slot name="fault" />
    </slot>
  </section>
</template>

<style scoped>
.region {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
