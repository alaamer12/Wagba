<script setup lang="ts">
import chefUrl from "../../assets/illustrations/chef-wandering.png";

withDefaults(defineProps<{ title: string; body?: string; art?: string; artSize?: number }>(), {
  body: "",
  art: chefUrl,
  artSize: 300,
});
</script>

<template>
  <div class="empty">
    <img :src="art" alt="" class="empty__art" :style="{ width: `${artSize}px` }" />
    <p class="empty__title">{{ title }}</p>
    <p v-if="body" class="empty__body">{{ body }}</p>
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
  height: auto;
  margin-bottom: 22px;
}
.empty__actions {
  margin-top: 20px;
}
.empty__title {
  font-size: 22px;
  font-weight: 800;
  margin: 0;
}
.empty__body {
  font-size: 14px;
  line-height: 1.8;
  color: var(--brown-mid);
  margin: 0;
  max-width: 30ch;
}
</style>
