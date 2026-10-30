<script setup lang="ts">
import Photo from "../../ui/adaptive/Photo.vue";

withDefaults(defineProps<{ size?: number }>(), { size: 36 });
</script>

<template>
  <span class="brand" :style="{ fontSize: `${size}px` }">
    <span class="brand__word">وجبة</span>
    <Photo src="../../assets/brand/chef-hat.svg" alt="" fit="auto" class="brand__hat" />
  </span>
</template>

<style scoped>
.brand {
  position: relative;
  display: inline-block;
  font-weight: 800;
  line-height: 1;
  color: var(--ink);
  padding-inline-end: 0.3em;
}
/* The lockup is drawn once from the mockup and does not mirror with direction. Position and
   size only: the drawing's own colours come with the asset. */
.brand__hat {
  position: absolute;
  top: -0.32em;
  right: -0.34em;
  width: 0.78em;
  height: auto;
}
</style>
