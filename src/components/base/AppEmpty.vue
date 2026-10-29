<script setup lang="ts">
defineProps<{ title: string; body?: string }>();
</script>

<template>
  <div class="empty">
    <img src="../../assets/brand/chef-hat.svg" alt="" class="empty__art" />
    <p class="empty__title">{{ title }}</p>
    <p v-if="body" class="empty__body">{{ body }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-2);
  padding: var(--space-6) var(--space-4);
}
.empty__art {
  width: 88px;
  height: 88px;
  opacity: 0.9;
  margin-bottom: var(--space-2);
}
.empty__title {
  font-size: 17px;
  font-weight: 700;
  margin: 0;
}
.empty__body {
  font-size: 14px;
  color: var(--brown-mid);
  margin: 0;
  max-width: 30ch;
}
</style>
