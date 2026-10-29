<script setup lang="ts">
withDefaults(defineProps<{ rows?: number }>(), { rows: 3 });
</script>

<template>
  <div class="skeleton-list" aria-hidden="true">
    <div v-for="row in rows" :key="row" class="skeleton-card">
      <div class="skeleton-thumb" />
      <div class="skeleton-lines">
        <div class="skeleton-line" />
        <div class="skeleton-line is-short" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.skeleton-card {
  display: flex;
  gap: var(--space-3);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: var(--space-3);
}
.skeleton-thumb {
  width: 84px;
  height: 84px;
  border-radius: 14px;
  background: var(--cream);
}
.skeleton-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}
.skeleton-line {
  height: 12px;
  border-radius: 6px;
  background: var(--cream);
}
.skeleton-line.is-short {
  width: 60%;
}
</style>
