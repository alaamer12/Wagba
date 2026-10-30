<script setup lang="ts">
import Image from "../../ui/adaptive/Photo.vue";
import Text from "../../ui/adaptive/Text.vue";

// A notice that says "nothing here". The illustration is supplied by the caller because
// it is per screen, not per kind (states.md): Home shows the pot, My Meals the chef, and
// `fault` or `blocked` deliberately carry no drawing at all. A default here would put one
// screen's artwork inside a global unit — which is what this line used to be.
withDefaults(defineProps<{ title: string; body?: string; art?: string; artSize?: number }>(), {
  body: "",
  art: "",
  artSize: 300,
});
</script>

<template>
  <div class="empty">
    <div v-if="art" class="empty__art" :style="{ width: `${artSize}px` }">
      <Image :src="art" alt="" fit="auto" />
    </div>
    <div class="empty__title">
      <Text>{{ title }}</Text>
    </div>
    <div v-if="body" class="empty__body">
      <Text>{{ body }}</Text>
    </div>
    <div v-if="$slots.default" class="empty__actions">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 0 0 var(--space-4);
}
.empty__art {
  max-width: 100%;
  margin-bottom: 22px;
}
.empty__actions {
  margin-top: 20px;
}
/* The wrapper carries the class and the seam's paragraph carries the type, so the notice's
   look never depends on a rule painted onto Image or Text itself. */
.empty__title p {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
}
.empty__body p {
  margin: 0;
  max-width: 30ch;
  font-size: 14px;
  line-height: 1.8;
  color: var(--brown-mid);
}
</style>
