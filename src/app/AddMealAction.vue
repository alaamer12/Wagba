<script setup lang="ts">
import Button from "../ui/adaptive/Button.vue";

// The raised center control. It emits a selection; deciding where that goes is the View's
// job, which is the whole reason the plus button's routing is one place to change.
defineOptions({ inheritAttrs: false });
defineEmits<{ select: [] }>();
</script>

<template>
  <span class="add">
    <Button variant="bare" class="add__control" v-bind="$attrs" @click="$emit('select')">
      <span class="add__glyph"><slot /></span>
    </Button>
  </span>
</template>

<style scoped>
/* The raised disc is a wrapper, not a painted seam: background, shadow and type stay off
   Button, which is given only the box it fills. Attributes land on Button, not the span. */
.add {
  display: inline-flex;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: var(--butter);
  box-shadow: var(--shadow-soft);
  transform: translateY(-10px);
  cursor: pointer;
}
.add__control {
  width: 100%;
  height: 100%;
}
.add__glyph {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: var(--ink);
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}
</style>
