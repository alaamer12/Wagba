<script setup lang="ts">
withDefaults(defineProps<{ withBar?: boolean }>(), { withBar: true });
</script>

<template>
  <div class="shell">
    <slot name="bar" />
    <main class="shell__content">
      <slot />
    </main>
    <slot v-if="withBar" name="bottom" />
  </div>
</template>

<style scoped>
.shell {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--cream);
  padding-top: env(safe-area-inset-top);
}
.shell__content {
  flex: 1;
  padding: var(--space-4);
  padding-bottom: calc(96px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
