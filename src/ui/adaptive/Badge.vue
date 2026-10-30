<script setup lang="ts">
withDefaults(defineProps<{ tone?: "neutral" | "muted" }>(), { tone: "neutral" });
</script>

<template>
  <span class="badge" :class="`is-${tone}`"><slot /></span>
</template>

<style scoped>
.badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  background: var(--butter-soft);
  color: var(--ink);
}
.badge.is-muted {
  background: var(--cream);
  color: var(--brown-mid);
  border: 1px solid var(--border);
}
</style>
