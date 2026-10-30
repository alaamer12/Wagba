<script setup lang="ts">
withDefaults(defineProps<{ tone?: "info" | "warning" }>(), { tone: "info" });
</script>

<template>
  <div class="banner" :class="`is-${tone}`" role="status">
    <slot />
  </div>
</template>

<style scoped>
.banner {
  font-size: 13px;
  padding: 10px 14px;
  border-radius: var(--radius-field);
  border: 1px solid var(--border);
  background: var(--butter-soft);
  color: var(--ink);
}
.banner.is-warning {
  background: #f7e3c2;
}
</style>
