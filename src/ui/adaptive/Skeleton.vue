<script setup lang="ts">
import BaseSkeleton from "../base/Skeleton.vue";

// The shape of a loading card: a thumb and two lines. base is Quasar's QSkeleton; the classes
// below keep the cream blocks and their measurements, and the animation is left off because the
// design is a still placeholder.
withDefaults(defineProps<{ rows?: number }>(), { rows: 3 });
</script>

<template>
  <div class="skeleton-list" aria-hidden="true">
    <div v-for="row in rows" :key="row" class="skeleton-card">
      <BaseSkeleton class="skeleton-thumb" animation="none" />
      <div class="skeleton-lines">
        <BaseSkeleton class="skeleton-line" animation="none" />
        <BaseSkeleton class="skeleton-line is-short" animation="none" />
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
